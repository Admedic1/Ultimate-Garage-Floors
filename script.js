// =========================================
//     PHONE VERIFICATION (OTP) FUNCTIONS
// =========================================

let verifiedPhone = null; // Store the verified phone number

async function sendOTP(phone) {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    throw new Error('Please enter a valid 10-digit phone number');
  }

  console.log('📱 Sending OTP to:', phone);
  
  const response = await fetch('/api/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: digitsOnly })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send verification code');
  }

  console.log('✅ OTP sent successfully');
  return data;
}

async function verifyOTP(phone, code) {
  const digitsOnly = phone.replace(/\D/g, '');
  
  console.log('🔐 Verifying OTP for:', phone);
  
  const response = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: digitsOnly, code: code })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Verification failed');
  }

  if (data.status === 'approved') {
    verifiedPhone = digitsOnly;
    console.log('✅ Phone verified successfully');
    return true;
  }

  throw new Error('Invalid code. Please try again.');
}

// =========================================
//     LEAD SUBMISSION FUNCTION
// =========================================

function sendLeadToZapier(userData) {
  // VALIDATION: Ensure all fields are filled before sending
  if (!userData.name || !userData.city || !userData.zip || !userData.email || !userData.phone || !userData.project_type) {
    console.error("❌ BLOCKED: Cannot send incomplete lead data", userData);
    alert("Please fill out all fields before submitting.");
    return false;
  }
  
  // Additional validation: Check for empty/whitespace-only values
  if (!userData.name.trim() || !userData.city.trim() || !userData.zip.trim() || !userData.email.trim() || !userData.phone.trim()) {
    console.error("❌ BLOCKED: Cannot send blank lead data", userData);
    return false;
  }
  
  const payload = {
    name: userData.name.trim(),
    project_type: userData.project_type,
    city: userData.city.trim(),
    zip: userData.zip.trim(),
    email: userData.email.trim(),
    phone: userData.phone.trim(),
    phone_verified: userData.phone_verified ? 'yes' : 'no',
    ab_variant: window.abTestVariant || 'unknown'
  };
  
  console.log("✅ Validation passed. Sending lead to Zapier and Google Sheets:", payload);
  console.log("Payload JSON string:", JSON.stringify(payload));
  
  let zapierSuccess = false;
  let sheetsSuccess = false;
  
  // Send to Zapier (primary)
  fetch("https://hooks.zapier.com/hooks/catch/23450484/uaut17y/", {
    method: "POST",
    body: JSON.stringify(payload)
  })
  .then(response => {
    zapierSuccess = response.ok;
    console.log(zapierSuccess ? "✅ Zapier response status:" : "⚠️ Zapier response status:", response.status);
    return response.text();
  })
  .then(data => {
    console.log("Zapier response data:", data);
  })
  .catch(error => {
    console.error("❌ Error sending lead to Zapier:", error);
  });
  
  // Send to Google Sheets (backup) - using form data for reliability
  const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwyIWqYDAlBkTxn9gY7jWUHeZT4RAWH8g4BxJS2cLF5M5lt62C0SP7Co11miz6RvZ8/exec";
  
  if (GOOGLE_SHEET_URL && !GOOGLE_SHEET_URL.includes("PASTE_YOUR")) {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('project_type', payload.project_type);
    formData.append('city', payload.city);
    formData.append('zip', payload.zip);
    formData.append('email', payload.email);
    formData.append('phone', payload.phone);
    formData.append('phone_verified', payload.phone_verified);
    formData.append('ab_variant', payload.ab_variant);
    
    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      body: formData
    })
    .then(response => response.text())
    .then(data => {
      console.log("✅ Google Sheets backup response:", data);
    })
    .catch(error => {
      console.error("❌ Error sending to Google Sheets backup:", error);
    });
  } else {
    console.warn("⚠️ Google Sheets backup URL not configured yet");
  }
  
  return true;
}

console.log("Ultimate Garage Floors - script loaded v1.0");

// -------------------------------------------------
//          A/B TEST LOGIC
// -------------------------------------------------

(function initABTest() {
    // Check if user already has an assigned variant
    let variant = localStorage.getItem('ab_test_variant');
    
    // If no variant assigned, randomly assign one
    if (!variant) {
        variant = Math.random() < 0.5 ? 'A' : 'B';
        localStorage.setItem('ab_test_variant', variant);
        console.log('🧪 A/B Test: New visitor assigned to Variant', variant);
    } else {
        console.log('🧪 A/B Test: Returning visitor - Variant', variant);
    }
    
    // Store variant globally for tracking
    window.abTestVariant = variant;
    
    // If Variant B, show the before/after image
    if (variant === 'B') {
        document.addEventListener('DOMContentLoaded', function() {
            const abTestImage = document.getElementById('abTestImage');
            if (abTestImage) {
                abTestImage.style.display = 'block';
                console.log('🧪 A/B Test: Showing before/after image (Variant B)');
            }
        });
    }
    
    // Send variant to Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'ab_test_variant', {
            'event_category': 'A/B Test',
            'event_label': 'Homepage Image Test',
            'value': variant === 'A' ? 0 : 1,
            'variant': variant
        });
        console.log('🧪 A/B Test: Sent variant to Google Analytics');
    }
})();

// -------------------------------------------------
//          QUIZ LOGIC BELOW
// -------------------------------------------------

(function() {
    'use strict';

    let currentStep = 0;
    let userData = {};

    const quizData = {
        steps: ['step0', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'],
        progress: [0, 10, 20, 35, 50, 65, 85, 100]
    };

    function initQuiz() {
        const quizOptions = document.querySelectorAll('.quiz-option[data-answer]');
        const projectTypeOptions = document.querySelectorAll('.project-type-option');
        // Get next buttons excluding the OTP-specific buttons
        const nextButtons = document.querySelectorAll('.quiz-btn-next:not(#sendCodeBtn):not(#verifyCodeBtn)');

        quizOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleInitialQuestion.call(this, e);
            });
        });

        projectTypeOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleProjectTypeQuestion.call(this, e);
            });
        });

        nextButtons.forEach((btn, index) => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleNextStep(index + 2); // +2 because step0 and step1 are multiple choice
            });
        });

        // Get inputs excluding phone and OTP inputs (handled separately)
        const inputs = document.querySelectorAll('.quiz-input:not(#userPhone):not(#otpCode)');
        inputs.forEach((input, index) => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleNextStep(index + 2); // +2 because step0 and step1 are multiple choice
                }
            });
        });

        // Initialize OTP verification handlers
        initOTPHandlers();
    }

    // =========================================
    //     OTP VERIFICATION UI HANDLERS
    // =========================================

    function initOTPHandlers() {
        const sendCodeBtn = document.getElementById('sendCodeBtn');
        const verifyCodeBtn = document.getElementById('verifyCodeBtn');
        const resendCodeBtn = document.getElementById('resendCodeBtn');
        const changePhoneBtn = document.getElementById('changePhoneBtn');
        const phoneInput = document.getElementById('userPhone');
        const otpInput = document.getElementById('otpCode');
        const phoneInputPhase = document.getElementById('phoneInputPhase');
        const otpVerifyPhase = document.getElementById('otpVerifyPhase');
        const phoneDisplay = document.getElementById('phoneDisplay');

        // Send Code button click
        if (sendCodeBtn) {
            sendCodeBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const phone = phoneInput.value.trim();
                const digitsOnly = phone.replace(/\D/g, '');
                
                if (digitsOnly.length < 10) {
                    phoneInput.focus();
                    phoneInput.style.borderColor = '#ef4444';
                    phoneInput.value = '';
                    phoneInput.placeholder = 'Enter a valid 10-digit phone number';
                    setTimeout(() => {
                        phoneInput.style.borderColor = '';
                        phoneInput.placeholder = '(540) 123-4567';
                    }, 2000);
                    return;
                }

                // Show loading state
                sendCodeBtn.disabled = true;
                sendCodeBtn.textContent = '📱 Sending code...';

                try {
                    await sendOTP(phone);
                    
                    // Switch to OTP verification phase
                    phoneInputPhase.classList.add('hidden');
                    otpVerifyPhase.classList.remove('hidden');
                    phoneDisplay.textContent = 'Code sent to: ' + formatPhoneDisplay(phone);
                    
                    // Focus on OTP input
                    setTimeout(() => otpInput.focus(), 100);
                    
                    console.log('✅ Switched to OTP verification phase');
                } catch (error) {
                    console.error('❌ Error sending OTP:', error);
                    alert(error.message || 'Failed to send verification code. Please try again.');
                    sendCodeBtn.disabled = false;
                    sendCodeBtn.textContent = 'Send Verification Code →';
                }
            });
        }

        // Phone input Enter key
        if (phoneInput) {
            phoneInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendCodeBtn.click();
                }
            });
        }

        // Verify Code button click
        if (verifyCodeBtn) {
            verifyCodeBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const phone = phoneInput.value.trim();
                const code = otpInput.value.trim();
                
                if (code.length !== 6 || !/^\d{6}$/.test(code)) {
                    otpInput.focus();
                    otpInput.style.borderColor = '#ef4444';
                    otpInput.value = '';
                    otpInput.placeholder = 'Enter 6-digit code';
                    setTimeout(() => {
                        otpInput.style.borderColor = '';
                    }, 2000);
                    return;
                }

                // Show loading state
                verifyCodeBtn.disabled = true;
                verifyCodeBtn.textContent = '🔐 Verifying...';

                try {
                    await verifyOTP(phone, code);
                    
                    // Phone verified! Store and proceed
                    userData.phone = phone;
                    userData.phone_verified = true;
                    
                    console.log('✅ Phone verified! Submitting lead...');
                    
                    // Submit the lead
                    const sendSuccess = sendLeadToZapier(userData);
                    
                    if (sendSuccess) {
                        showStep(7); // Go to thank you page
                    } else {
                        throw new Error('Failed to submit lead');
                    }
                } catch (error) {
                    console.error('❌ Verification error:', error);
                    otpInput.value = '';
                    otpInput.style.borderColor = '#ef4444';
                    otpInput.placeholder = error.message || 'Invalid code';
                    verifyCodeBtn.disabled = false;
                    verifyCodeBtn.textContent = 'Verify & Get My Quote →';
                    setTimeout(() => {
                        otpInput.style.borderColor = '';
                        otpInput.placeholder = 'Enter 6-digit code';
                    }, 2000);
                }
            });
        }

        // OTP input Enter key
        if (otpInput) {
            otpInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    verifyCodeBtn.click();
                }
            });
        }

        // Resend Code button
        if (resendCodeBtn) {
            resendCodeBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                
                const phone = phoneInput.value.trim();
                
                resendCodeBtn.disabled = true;
                resendCodeBtn.textContent = 'Sending...';

                try {
                    await sendOTP(phone);
                    resendCodeBtn.textContent = '✅ Code sent!';
                    setTimeout(() => {
                        resendCodeBtn.disabled = false;
                        resendCodeBtn.textContent = 'Resend Code';
                    }, 3000);
                } catch (error) {
                    alert(error.message || 'Failed to resend code. Please try again.');
                    resendCodeBtn.disabled = false;
                    resendCodeBtn.textContent = 'Resend Code';
                }
            });
        }

        // Change Phone button
        if (changePhoneBtn) {
            changePhoneBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Switch back to phone input phase
                otpVerifyPhase.classList.add('hidden');
                phoneInputPhase.classList.remove('hidden');
                
                // Reset states
                phoneInput.value = '';
                otpInput.value = '';
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = 'Send Verification Code →';
                verifyCodeBtn.disabled = false;
                verifyCodeBtn.textContent = 'Verify & Get My Quote →';
                
                setTimeout(() => phoneInput.focus(), 100);
            });
        }
    }

    function formatPhoneDisplay(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
            return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
        }
        return phone;
    }

    function handleProjectTypeQuestion(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const projectType = this.getAttribute('data-project');
        userData.project_type = projectType;

        // Highlight selected option
        document.querySelectorAll('.project-type-option').forEach(opt => {
            opt.classList.remove('quiz-option-selected');
        });
        this.classList.add('quiz-option-selected');

        console.log('📍 Project type selected:', projectType);

        // Move to next step after short delay
        setTimeout(() => {
            showStep(2);
        }, 300);
    }

    function handleInitialQuestion(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const answer = this.getAttribute('data-answer');

        if (answer === 'no') {
            alert('We primarily work with homeowners.');
            return;
        }

        document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('quiz-option-primary');
        });

        this.classList.add('quiz-option-primary');

        userData.homeowner = answer;
        
        // Make quiz sticky/modal when user engages
        setTimeout(() => {
            makeQuizSticky();
            showStep(1); // Go to project type question
        }, 300);
    }

    function makeQuizSticky() {
        const quizCard = document.getElementById('quizCard');
        const body = document.body;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'quiz-overlay';
        overlay.className = 'quiz-sticky-overlay';
        
        // Add sticky classes
        quizCard.classList.add('quiz-sticky-active');
        body.classList.add('quiz-modal-open');
        
        // Insert overlay before quiz card
        quizCard.parentNode.insertBefore(overlay, quizCard);
        
        console.log('✅ Quiz is now sticky - user locked in!');
    }

    let isSubmitting = false; // Prevent double submissions

    function handleNextStep(stepIndex) {
        // Prevent double-clicks during submission
        if (isSubmitting && stepIndex === 6) {
            console.log("⚠️ Submission already in progress...");
            return;
        }

        const input = getInputForStep(stepIndex);
        if (!input) return;

        const value = input.value.trim();
        
        // Stronger validation: Check for empty values
        if (!value || value.length === 0) {
            input.focus();
            input.style.borderColor = '#ef4444';
            input.placeholder = stepIndex === 2 ? 'Please enter your name' : 
                               stepIndex === 3 ? 'Please enter your city' :
                               stepIndex === 4 ? 'Please enter your zip code' :
                               stepIndex === 5 ? 'Please enter a valid email' :
                               'Please enter your phone number';
            setTimeout(() => {
                input.style.borderColor = '';
                input.placeholder = stepIndex === 2 ? 'Enter your name' : 
                                   stepIndex === 3 ? 'Enter your city' :
                                   stepIndex === 4 ? 'Enter zip code' :
                                   stepIndex === 5 ? 'your@email.com' :
                                   '(540) 123-4567';
            }, 2000);
            return;
        }

        // Name validation for step 2 (at least 2 characters, letters and spaces only)
        if (stepIndex === 2) {
            const nameRegex = /^[a-zA-Z\s'-]{2,50}$/;
            if (!nameRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.value = '';
                input.placeholder = value.length < 2 ? 'Name must be at least 2 characters' : 'Please enter a valid name (letters only)';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'Enter your name';
                }, 2000);
                return;
            }
        }

        // City validation for step 3 (at least 2 characters, letters and spaces only)
        if (stepIndex === 3) {
            const cityRegex = /^[a-zA-Z\s'-]{2,50}$/;
            if (!cityRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.value = '';
                input.placeholder = value.length < 2 ? 'City must be at least 2 characters' : 'Please enter a valid city name';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'Enter your city';
                }, 2000);
                return;
            }
        }

        // Zip code validation for step 4 (exactly 5 digits)
        if (stepIndex === 4) {
            const zipRegex = /^\d{5}$/;
            if (!zipRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.value = '';
                input.placeholder = 'Enter a valid 5-digit zip code';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'Enter zip code';
                }, 2000);
                return;
            }
        }

        // Email validation for step 5
        if (stepIndex === 5) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.value = '';
                input.placeholder = 'Enter a valid email (e.g. you@email.com)';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'your@email.com';
                }, 2000);
                return;
            }
        }

        // Note: Phone validation (step 6) is now handled by OTP verification handlers

        if (stepIndex === 2) {
            userData.name = value;
            updatePersonalizedMessages(value);
        } else if (stepIndex === 3) {
            userData.city = value;
        } else if (stepIndex === 4) {
            userData.zip = value;
        } else if (stepIndex === 5) {
            userData.email = value;
        }
        // Note: Step 6 (phone) is now handled by OTP verification handlers, not here

        // After step 5 (email), go to step 6 (phone with OTP verification)
        // The OTP handlers will take over from there
        if (stepIndex < 6) {
            showStep(stepIndex + 1);
        }
        // Don't auto-advance from step 6 - OTP verification handles that
    }

    function getInputForStep(stepIndex) {
        const inputs = {
            2: document.getElementById('userName'),
            3: document.getElementById('userCity'),
            4: document.getElementById('userZip'),
            5: document.getElementById('userEmail'),
            6: document.getElementById('userPhone')
        };
        return inputs[stepIndex];
    }

    function updatePersonalizedMessages(name) {
        const step3Title = document.getElementById('step3Title');
        const step4Title = document.getElementById('step4Title');
        const step5Title = document.getElementById('step5Title');
        const step6Title = document.getElementById('step6Title');

        if (step3Title) step3Title.textContent = `Hi ${name}! What city are you in?`;
        if (step4Title) step4Title.textContent = `${name}, what's your zip code?`;
        if (step5Title) step5Title.textContent = `${name}, what's your email?`;
        if (step6Title) step6Title.textContent = `Last step ${name}! What's your phone number?`;
    }

    function showStep(stepIndex) {
        document.querySelectorAll('.quiz-step').forEach(step => {
            step.classList.add('hidden');
        });

        const currentStepEl = document.getElementById(quizData.steps[stepIndex]);
        if (currentStepEl) {
            currentStepEl.classList.remove('hidden');

            const progressBar = currentStepEl.querySelector('.progress-bar');
            if (progressBar) progressBar.style.width = quizData.progress[stepIndex] + '%';

            // Focus first input if exists
            const input = currentStepEl.querySelector('.quiz-input');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }

            // Scroll quiz into view on mobile
            if (window.innerWidth < 768) {
                const quizCard = document.getElementById('quizCard');
                if (quizCard) {
                    quizCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        // Hide footer on success step
        const footer = document.getElementById('quizFooter');
        if (footer) {
            footer.style.display = stepIndex === 7 ? 'none' : 'block';
        }

        // Log when thank-you page is shown
        if (stepIndex === 7) {
            console.log('📄 Thank you page now visible to user');
            
            // Update URL for conversion tracking
            window.history.pushState({}, '', '?thank-you=1');
            console.log('📍 URL updated to /?thank-you=1 for conversion tracking');
            
            // Remove sticky mode on thank you page
            removeQuizSticky();
            
            // Fire Meta Pixel Lead event
            if (typeof fbq === 'function') {
                fbq('track', 'Lead', {value: 0.00, currency: 'USD'});
                console.log("🔥 Meta Pixel Lead event fired");
            }
            
            // Fire Google Ads conversion event
            if (typeof gtag === 'function') {
                gtag('event', 'conversion', {
                    'send_to': 'AW-CONVERSION_ID/CONVERSION_LABEL'
                });
                gtag('event', 'generate_lead', {
                    'event_category': 'Lead',
                    'event_label': 'Quiz Completion'
                });
                console.log("🔥 Google Analytics lead event fired");
            }
        }

        currentStep = stepIndex;
    }

    function removeQuizSticky() {
        const quizCard = document.getElementById('quizCard');
        const overlay = document.getElementById('quiz-overlay');
        const body = document.body;
        
        if (quizCard) {
            quizCard.classList.remove('quiz-sticky-active');
        }
        
        if (overlay) {
            overlay.remove();
        }
        
        body.classList.remove('quiz-modal-open');
        
        console.log('✅ Quiz sticky mode removed - user can scroll freely');
    }

    function initCTAs() {
        const ctaButtons = document.querySelectorAll('.btn-primary, .btn-lg');
        ctaButtons.forEach(btn => {
            if (!btn.closest('.quiz-card')) {
                btn.addEventListener('click', function(e) {
                    const quizCard = document.getElementById('quizCard');
                    if (quizCard) {
                        e.preventDefault();
                        quizCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // If on step 0, trigger first question
                        if (currentStep === 0) {
                            const firstOption = document.querySelector('.quiz-option[data-answer="yes"]');
                            if (firstOption) {
                                setTimeout(() => firstOption.click(), 500);
                            }
                        }
                    }
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initQuiz();
            initCTAs();
        });
    } else {
        initQuiz();
        initCTAs();
    }
})();
