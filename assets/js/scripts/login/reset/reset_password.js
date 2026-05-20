const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const resetCodeForm = document.getElementById('resetCodeForm');
if (resetCodeForm) {
  resetCodeForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email');
    const btn = resetCodeForm.querySelector('button');
    
    if (!email.value.trim() || !email.value.includes('@')) {
      email.style.borderColor = '#dc3545';
      const msg = document.createElement('p');
      msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
      msg.textContent = 'Enter a valid email.';
      email.parentNode.insertBefore(msg, email.nextSibling);
      return;
    }
    
    email.style.borderColor = '';
    const existingMsg = email.nextElementSibling;
    if (existingMsg && existingMsg.tagName === 'P') existingMsg.remove();
    
    sessionStorage.setItem('resetEmail', email.value.trim());
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    supabaseClient.auth.signInWithOtp({
      email: email.value.trim(),
      options: { shouldCreateUser: false }
    }).then(function(response) {
      const error = response.error;
      if (error) {
        email.style.borderColor = '#dc3545';
        const msg = document.createElement('p');
        msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
        msg.textContent = error.message;
        email.parentNode.insertBefore(msg, email.nextSibling);
        btn.disabled = false;
        btn.textContent = 'Send Code';
      } else {
        setTimeout(function() {
          window.location.href = 'code_sent.html';
        }, 1000);
      }
    });
  });
}

const resetPassForm = document.getElementById('resetPassForm');
if (resetPassForm) {
  document.getElementById('email').value = sessionStorage.getItem('resetEmail') || '';
  
  resetPassForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = resetPassForm.querySelector('button');
    const newPass = document.getElementById('newPassword');
    const confirmPass = document.getElementById('confirmPassword');
    const email = document.getElementById('email').value.trim();
    
    // Check that password is not empty
    if (!newPass.value || newPass.value.trim() === '') {
      newPass.style.borderColor = '#dc3545';
      const msg = document.createElement('p');
      msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
      msg.textContent = 'Password cannot be empty';
      newPass.parentNode.insertBefore(msg, newPass.nextSibling);
      return;
    }
    
    if (newPass.value !== confirmPass.value) {
      newPass.style.borderColor = '';
      confirmPass.style.borderColor = '#dc3545';
      const msg = document.createElement('p');
      msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
      msg.textContent = 'Passwords do not match';
      confirmPass.parentNode.insertBefore(msg, confirmPass.nextSibling);
      return;
    }
    
    newPass.style.borderColor = '';
    confirmPass.style.borderColor = '';
    const existingMsg = confirmPass.nextElementSibling;
    if (existingMsg && existingMsg.tagName === 'P') existingMsg.remove();
    
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    supabaseClient.auth.verifyOtp({ email: email, token: confirmPass.value, type: 'email' })
      .then(function(verifyResponse) {
        const verifyError = verifyResponse.error;
        if (verifyError) {
          confirmPass.style.borderColor = '#dc3545';
          const msg = document.createElement('p');
          msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
          msg.textContent = 'Invalid code';
          confirmPass.parentNode.insertBefore(msg, confirmPass.nextSibling);
          btn.disabled = false;
          btn.textContent = 'Reset Password';
          return;
        }
        
        return supabaseClient.auth.updateUser({ password: newPass.value })
          .then(function(updateResponse) {
            const updateError = updateResponse.error;
            if (updateError) {
              const msg = document.createElement('p');
              msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 0 0;';
              msg.textContent = updateError.message;
              btn.parentNode.insertBefore(msg, btn);
              btn.disabled = false;
              btn.textContent = 'Reset Password';
              return;
            }
            
            sessionStorage.removeItem('resetEmail');
            showMessage('Password reset! Redirecting...', false);
            setTimeout(function() {
              window.location.href = '/views/index.html';
            }, 1500);
          });
      });
  });
}

function showMessage(msg, isError) {
  const existing = document.getElementById('formMessage');
  if (existing) existing.remove();
  
  const msgEl = document.createElement('div');
  msgEl.id = 'formMessage';
  const color = isError ? '#dc3545' : '#28a745';
  msgEl.style.cssText = 'color: ' + color + '; font-size: 0.875rem; margin-top: 8px;';
  msgEl.textContent = msg;
  
  const btn = resetPassForm.querySelector('button');
  if (btn) btn.insertAdjacentElement('afterend', msgEl);
}
