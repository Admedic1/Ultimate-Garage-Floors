function sendLeadToZapier(userData) {
  // VALIDATION: Ensure all fields are filled before sending
  if (!userData.name || !userData.zip || !userData.email || !userData.phone) {
    console.error("❌ BLOCKED: Cannot send incomplete lead data", userData);
    alert("Please fill out all fields before submitting.");
    return false;
  }
  
  // Additional validation: Check for empty/whitespace-only values
  if (!userData.name.trim() || !userData.zip.trim() || !userData.email.trim() || !userData.phone.trim()) {
    console.error("❌ BLOCKED: Cannot send blank lead data", userData);
    return false;
  }
  
  const payload = {
    name: userData.name.trim(),
    zip: userData.zip.trim(),
    email: userData.email.trim(),
    phone: userData.phone.trim(),
    ab_variant: window.abTestVariant || 'unknown'
  };
  
  console.log("✅ Validation passed. Sending lead to Zapier and Google Sheets:", payload);
  console.log("Payload JSON string:", JSON.stringify(payload));
  
  let zapierSuccess = false;
  let sheetsSuccess = false;
  
  // Send to Zapier (primary) - using form data for better compatibility
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('zip', payload.zip);
  formData.append('email', payload.email);
  formData.append('phone', payload.phone);
  formData.append('ab_variant', payload.ab_variant);
  
  fetch("https://hooks.zapier.com/hooks/catch/23450484/uaut17y/", {
    method: "POST",
    body: formData
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
  
  // Send to Google Sheets (backup) - UPDATE WITH YOUR OWN URL
  const GOOGLE_SHEET_URL = "PASTE_YOUR_GOOGLE_SHEETS_URL_HERE";
  
  if (GOOGLE_SHEET_URL && !GOOGLE_SHEET_URL.includes("PASTE_YOUR")) {
    fetch(GOOGLE_SHEET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      sheetsSuccess = response.ok;
      console.log(sheetsSuccess ? "✅ Google Sheets backup status:" : "⚠️ Google Sheets backup status:", response.status);
      return response.json();
    })
    .then(data => {
      console.log("Google Sheets backup response:", data);
    })
    .catch(error => {
      console.error("❌ Error sending to Google Sheets backup:", error);
    });
  } else {
    console.warn("⚠️ Google Sheets backup URL not configured yet");
  }
  
  return true;
}

console.log("Custom Epoxy Solutions - script loaded v1.0");

// -------------------------------------------------
//          A/B TEST LOGIC
// -------------------------------------------------

(function initABTest() {
    // Check URL parameter for forced variant (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const forcedVariant = urlParams.get('variant');
    
    let variant;
    
    if (forcedVariant === 'A' || forcedVariant === 'B') {
        variant = forcedVariant;
        localStorage.setItem('ab_test_variant', variant);
        console.log('🧪 A/B Test: Forced to Variant', variant, '(via URL)');
    } else {
        // Check if user already has an assigned variant
        variant = localStorage.getItem('ab_test_variant');
        
        // If no variant assigned, randomly assign one
        if (!variant) {
            variant = Math.random() < 0.5 ? 'A' : 'B';
            localStorage.setItem('ab_test_variant', variant);
            console.log('🧪 A/B Test: New visitor assigned to Variant', variant);
        } else {
            console.log('🧪 A/B Test: Returning visitor - Variant', variant);
        }
    }
    
    // Store variant globally for tracking
    window.abTestVariant = variant;
    
    // Show the correct variant immediately (before DOMContentLoaded if possible)
    function showVariant() {
        const variantA = document.getElementById('variantA');
        const variantB = document.getElementById('variantB');
        
        if (variant === 'A') {
            if (variantA) variantA.style.display = 'block';
            if (variantB) variantB.style.display = 'none';
            console.log('🧪 A/B Test: Showing Variant A (bullets)');
        } else {
            if (variantA) variantA.style.display = 'none';
            if (variantB) variantB.style.display = 'block';
            console.log('🧪 A/B Test: Showing Variant B (before/after image)');
        }
    }
    
    // Try immediately, then also on DOMContentLoaded
    showVariant();
    document.addEventListener('DOMContentLoaded', showVariant);
    
})();

// -------------------------------------------------
//          QUIZ LOGIC BELOW
// -------------------------------------------------

(function() {
    'use strict';

    let currentStep = 0;
    let userData = {};

    const quizData = {
        steps: ['step0', 'step1', 'step2', 'step3', 'step4', 'step5', 'step6'],
        progress: [0, 15, 30, 50, 70, 85, 100]
    };

    function initQuiz() {
        console.log('🚀 initQuiz() called');
        const quizOptions = document.querySelectorAll('.quiz-option[data-answer]');
        const nextButtons = document.querySelectorAll('.quiz-btn-next');
        console.log('🚀 Found', nextButtons.length, 'next buttons');

        quizOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                handleInitialQuestion.call(this, e);
            });
        });

        nextButtons.forEach((btn) => {
            const stepAttr = btn.getAttribute('data-step');
            const stepNum = parseInt(stepAttr);
            console.log('🟡 Button found with data-step="' + stepAttr + '", parsed as:', stepNum);
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟡 Button clicked! data-step=' + stepAttr + ', calling handleNextStep(' + stepNum + ')');
                handleNextStep(stepNum);
            });
        });

        const inputs = document.querySelectorAll('.quiz-input');
        inputs.forEach((input) => {
            const stepNum = parseInt(input.getAttribute('data-step'));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('🟡 Enter pressed! Calling handleNextStep(' + stepNum + ')');
                    handleNextStep(stepNum);
                }
            });
        });
    }

    function handleInitialQuestion(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const answer = this.getAttribute('data-answer');

        // Handle homeowner question (step0)
        if (answer === 'no') {
            alert('We primarily work with homeowners. Please have the homeowner fill out the form.');
            return;
        }

        if (answer === 'yes') {
            document.querySelectorAll('#step0 .quiz-option').forEach(opt => {
                opt.classList.remove('quiz-option-primary');
            });
            this.classList.add('quiz-option-primary');

            userData.homeowner = answer;
            
            // Make quiz sticky/modal when user engages
            setTimeout(() => {
                makeQuizSticky();
                showStep(1); // Go to space type step (index 1 in array)
            }, 300);
        }

        // Handle space type question (step1)
        if (answer === 'garage' || answer === 'basement' || answer === 'outdoor' || answer === 'commercial') {
            document.querySelectorAll('#step1 .quiz-option').forEach(opt => {
                opt.classList.remove('quiz-option-primary');
            });
            this.classList.add('quiz-option-primary');

            userData.spaceType = answer;
            
            setTimeout(() => {
                showStep(2); // Go to name step (index 2 in array)
            }, 300);
        }
    }

    function showStepById(stepId) {
        document.querySelectorAll('.quiz-step').forEach(step => {
            step.classList.add('hidden');
        });
        
        const targetStep = document.getElementById(stepId);
        if (targetStep) {
            targetStep.classList.remove('hidden');
        }
        
        // Hide footer on disqualified step
        const quizFooter = document.getElementById('quizFooter');
        if (quizFooter) {
            quizFooter.style.display = stepId === 'stepDisqualified' ? 'none' : '';
        }
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
        console.log('🔵 handleNextStep called with stepIndex:', stepIndex);
        
        // Prevent double-clicks during submission
        if (isSubmitting && stepIndex === 5) {
            console.log("⚠️ Submission already in progress...");
            return;
        }

        const input = getInputForStep(stepIndex);
        console.log('🔵 getInputForStep returned:', input);
        if (!input) {
            console.log('❌ No input found for stepIndex:', stepIndex);
            return;
        }

        const value = input.value.trim();
        console.log('🔵 Trimmed value:', value, 'Length:', value.length);
        
        // Stronger validation: Check for empty values
        if (!value || value.length === 0) {
            console.log('❌ Validation failed: empty value');

            input.focus();
            input.style.borderColor = '#ef4444';
            input.placeholder = stepIndex === 2 ? 'Please enter your name' : 
                               stepIndex === 3 ? 'Please enter your zip code' :
                               stepIndex === 4 ? 'Please enter a valid email' :
                               'Please enter your phone number';
            setTimeout(() => {
                input.style.borderColor = '';
                input.placeholder = stepIndex === 2 ? 'Enter your name' : 
                                   stepIndex === 3 ? 'Enter zip code' :
                                   stepIndex === 4 ? 'your@email.com' :
                                   '(607) 123-4567';
            }, 2000);
            return;
        }

        // Name validation for step 2 (at least 2 characters)
        if (stepIndex === 2 && value.length < 2) {
            console.log('❌ Name validation failed: too short (length:', value.length, ')');
            input.focus();
            input.style.borderColor = '#ef4444';
            input.placeholder = 'Name must be at least 2 characters';
            setTimeout(() => {
                input.style.borderColor = '';
                input.placeholder = 'Enter your name';
            }, 2000);
            return;
        }
        
        console.log('✅ Validation passed for step', stepIndex);

        // Zip code validation for step 3
        if (stepIndex === 3) {
            const zipRegex = /^\d{5}$/;
            if (!zipRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.placeholder = 'Please enter a valid 5-digit zip code';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'Enter zip code';
                }, 2000);
                return;
            }
        }

        // Email validation for step 4
        if (stepIndex === 4) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.placeholder = 'Please enter a valid email';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = 'your@email.com';
                }, 2000);
                return;
            }
        }

        // Phone validation for step 5 (basic check)
        if (stepIndex === 5) {
            const phoneRegex = /[\d\(\)\-\s]{10,}/;
            if (!phoneRegex.test(value)) {
                input.focus();
                input.style.borderColor = '#ef4444';
                input.placeholder = 'Please enter a valid phone number';
                setTimeout(() => {
                    input.style.borderColor = '';
                    input.placeholder = '(607) 123-4567';
                }, 2000);
                return;
            }
        }

        if (stepIndex === 2) {
            console.log('✅ Storing name:', value);
            userData.name = value;
            updatePersonalizedMessages(value);
        } else if (stepIndex === 3) {
            console.log('✅ Storing zip:', value);
            userData.zip = value;
        } else if (stepIndex === 4) {
            console.log('✅ Storing email:', value);
            userData.email = value;
        } else if (stepIndex === 5) {
            console.log('✅ Storing phone:', value);
            userData.phone = value;

            // Set loading state
            isSubmitting = true;
            const btn = document.querySelector('.quiz-btn-next');
            const originalText = btn ? btn.textContent : '';
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.textContent = '⏳ Submitting...';
            }

            // SEND TO ZAPIER & GOOGLE SHEETS - function is in global scope
            const sendSuccess = sendLeadToZapier(userData);
            
            if (!sendSuccess) {
                // Reset if validation failed
                isSubmitting = false;
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.textContent = originalText;
                }
                console.error("❌ Failed to send lead - validation error");
                alert("There was an error submitting your information. Please check all fields and try again.");
                return;
            }

            // Success - proceed to thank you page
            // Fire Meta Pixel Lead event
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead');
                console.log('✅ Meta Pixel Lead event fired');
            }
            
            setTimeout(() => {
                isSubmitting = false;
                if (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.textContent = originalText;
                }
            }, 2000);
        }

        // Map input step indices to quizData.steps indices
        // Step 2 (name) → goes to step 3 (zip)
        // Step 3 (zip) → goes to step 4 (email)
        // Step 4 (email) → goes to step 5 (phone)
        // Step 5 (phone) → goes to step 6 (success)
        const nextStepMap = {
            2: 3,  // name → zip
            3: 4,  // zip → email
            4: 5,  // email → phone
            5: 6   // phone → success
        };
        
        console.log('🟢 Validation passed! Going to step:', nextStepMap[stepIndex]);
        showStep(nextStepMap[stepIndex]);
    }

    function getInputForStep(stepIndex) {
        const inputs = {
            2: document.getElementById('userName'),
            3: document.getElementById('userZip'),
            4: document.getElementById('userEmail'),
            5: document.getElementById('userPhone')
        };
        return inputs[stepIndex];
    }

    function updatePersonalizedMessages(name) {
        const step3Title = document.getElementById('step3Title');
        const step4Title = document.getElementById('step4Title');
        const step5Title = document.getElementById('step5Title');

        if (step3Title) step3Title.textContent = `Hi ${name}! What's your zip code?`;
        if (step4Title) step4Title.textContent = `${name}, what's your email?`;
        if (step5Title) step5Title.textContent = `Last step ${name}! What's your phone number?`;
    }

    function showStep(stepIndex) {
        console.log('🟣 showStep called with stepIndex:', stepIndex);
        console.log('🟣 Step ID to show:', quizData.steps[stepIndex]);
        
        document.querySelectorAll('.quiz-step').forEach(step => {
            step.classList.add('hidden');
        });

        const currentStepEl = document.getElementById(quizData.steps[stepIndex]);
        console.log('🟣 Step element found:', currentStepEl);
        if (currentStepEl) {
            currentStepEl.classList.remove('hidden');
            console.log('✅ Step', stepIndex, 'is now visible');

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
            footer.style.display = stepIndex === 6 ? 'none' : 'block';
        }

        // Log when thank-you page is shown
        if (stepIndex === 6) {
            console.log('📄 Thank you page (Step 6) now visible to user');
            
            // Remove sticky mode on thank you page
            removeQuizSticky();
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
