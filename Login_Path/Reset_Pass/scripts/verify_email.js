function clearError(input) {
  input.style.borderColor = '';
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
      showAlertPrompt('Password must contain: a symbol, a number, at least 8 text long');
      return;
    }
    
    if (newPass.value !== confirmPass.value) {
      showAlertPrompt('Passwords do not match');
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
        showAlertPrompt('Invalid code');
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
        showAlertPrompt(updateError.message);
        btn.disabled = false;
        btn.textContent = 'Reset Password';
        return;
      }
      
      sessionStorage.removeItem('resetEmail');
      window.location.href = '/index.html';
    });
}
