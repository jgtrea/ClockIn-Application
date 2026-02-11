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

function showFormMessage(message, isError) {
  const existing = document.getElementById('formMessage');
  if (existing) existing.remove();
  
  const msgEl = document.createElement('div');
  msgEl.id = 'formMessage';
  const color = isError ? '#dc3545' : '#28a745';
  msgEl.style.cssText = 'color: ' + color + '; font-size: 0.875rem; margin: 4px 0 12px 0; display: block;';
  msgEl.textContent = message;
  
  const btn = resetPassForm.querySelector('button');
  if (btn) btn.insertAdjacentElement('afterend', msgEl);
}

const resetPassForm = document.getElementById('resetPassForm');
if (resetPassForm) {
  const newPass = document.getElementById('newPassword');
  const confirmPass = document.getElementById('confirmPassword');
  const code = document.getElementById('code');
  
  newPass.addEventListener('input', function() { clearError(newPass); });
  confirmPass.addEventListener('input', function() { clearError(confirmPass); });
  code.addEventListener('input', function() { clearError(code); });
  
  resetPassForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = resetPassForm.querySelector('button');
    const emailValue = sessionStorage.getItem('resetEmail') || '';
    
    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPass.value);
    const hasNumber = /\d/.test(newPass.value);
    const isLongEnough = newPass.value.length >= 8;
    
    if (!hasSymbol || !hasNumber || !isLongEnough) {
      showError(newPass, 'Password must contain: a symbol, a number, at least 8 text long');
      return;
    }
    
    if (newPass.value !== confirmPass.value) {
      showError(confirmPass, 'Passwords do not match');
      return;
    }
    
    clearError(newPass);
    clearError(confirmPass);
    
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    verifyOTPAndReset(emailValue, code.value, newPass.value, btn);
  });
}

function verifyOTPAndReset(email, code, newPassword, btn) {
  const supabase = window.supabaseClient;
  
  supabase.auth.verifyOtp({ email: email, token: code, type: 'email' })
    .then(function(verifyResponse) {
      const verifyError = verifyResponse.error;
      if (verifyError) {
        showError(document.getElementById('code'), 'Invalid code');
        btn.disabled = false;
        btn.textContent = 'Reset Password';
        return;
      }
      
      updatePassword(email, newPassword, btn);
    });
}

function updatePassword(email, newPassword, btn) {
  const supabase = window.supabaseClient;
  
  supabase.auth.updateUser({ password: newPassword })
    .then(function(updateResponse) {
      const updateError = updateResponse.error;
      if (updateError) {
        showFormMessage(updateError.message, true);
        btn.disabled = false;
        btn.textContent = 'Reset Password';
        return;
      }
      
      sessionStorage.removeItem('resetEmail');
      window.location.href = '/index.html';
    });
}
