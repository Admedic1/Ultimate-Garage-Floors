// Vercel Serverless Function - Verify OTP via Twilio Verify
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and code are required' });
  }

  // Format phone number - ensure it starts with +1 for US
  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '+1' + formattedPhone;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
    formattedPhone = '+' + formattedPhone;
  } else {
    formattedPhone = '+' + formattedPhone;
  }

  try {
    const client = twilio(accountSid, authToken);
    
    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: formattedPhone,
        code: code
      });

    console.log('Verification check result:', verificationCheck.status);
    
    if (verificationCheck.status === 'approved') {
      return res.status(200).json({ 
        success: true, 
        status: 'approved',
        message: 'Phone number verified!'
      });
    } else {
      return res.status(400).json({ 
        success: false,
        status: verificationCheck.status,
        error: 'Invalid code. Please try again.'
      });
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    
    // Handle specific Twilio errors
    if (error.code === 60202) {
      return res.status(400).json({ 
        error: 'Code expired. Please request a new code.' 
      });
    }
    
    if (error.code === 60200) {
      return res.status(400).json({ 
        error: 'Invalid verification code.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Verification failed. Please try again.' 
    });
  }
}

