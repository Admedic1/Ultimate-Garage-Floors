// Vercel Serverless Function - Send OTP via Twilio Verify
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

  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
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
    
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: formattedPhone,
        channel: 'sms'
      });

    console.log('OTP sent successfully:', verification.status);
    
    return res.status(200).json({ 
      success: true, 
      status: verification.status,
      message: 'Verification code sent!'
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Handle specific Twilio errors
    if (error.code === 60200) {
      return res.status(400).json({ 
        error: 'Invalid phone number. Please check and try again.' 
      });
    }
    
    if (error.code === 60203) {
      return res.status(429).json({ 
        error: 'Too many attempts. Please wait a few minutes and try again.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to send verification code. Please try again.' 
    });
  }
}

