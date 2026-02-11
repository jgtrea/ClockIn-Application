function clearError(input) {
  input.style.borderColor = '';
  const existing = input.nextElementSibling;
  if (existing && existing.tagName === 'P' && existing.style.color === 'rgb(220, 53, 69)') {
    existing.remove();
  }
}

function showError(input, message) {
  clearError(input);
  const msg = document.createElement('p');
  msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 12px 0; display: block;';
  msg.textContent = message;
  input.parentNode.insertBefore(msg, input.nextSibling);
}

const resetCodeForm = document.getElementById('resetCodeForm');
if (resetCodeForm) {
  const email = document.getElementById('email');
  
  email.addEventListener('input', function() {
    clearError(email);
  });
  
  resetCodeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = resetCodeForm.querySelector('button');
    
    if (!email.value.trim() || !email.value.includes('@')) {
      showError(email, 'Enter a valid email.');
      return;
    }
    
    clearError(email);
    sessionStorage.setItem('resetEmail', email.value.trim());
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    sendOTPEmail(email.value.trim(), btn);
  });
}

function sendOTPEmail(email, btn) {
  const supabase = window.supabaseClient;
  
  supabase.auth.signInWithOtp({
    email: email,
    options: { shouldCreateUser: false }
  }).then(function(response) {
    const error = response.error;
    if (error) {
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('rate limit') || errorMsg.includes('too many') || errorMsg.includes('limit')) {
        showError(document.getElementById('email'), 'Password reset limit reached.');
      } else {
        showError(document.getElementById('email'), 'Email does not exist.');
      }
      btn.disabled = false;
      btn.textContent = 'Send Code';
    } else {
      setTimeout(function() {
        window.location.href = 'code_sent.html';
      }, 1000);
    }
  });
}
