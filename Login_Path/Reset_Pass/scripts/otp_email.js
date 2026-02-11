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
      msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 12px 0; display: block;';
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
    
    sendOTPEmail(email.value.trim());
  });
}

function sendOTPEmail(email) {
  const btn = resetCodeForm.querySelector('button');
  
  supabaseClient.auth.signInWithOtp({
    email: email,
    options: { shouldCreateUser: false }
  }).then(function(response) {
    const error = response.error;
    if (error) {
      const emailInput = document.getElementById('email');
      emailInput.style.borderColor = '#dc3545';
      const msg = document.createElement('p');
      msg.style.cssText = 'color: #dc3545; font-size: 0.875rem; margin: 4px 0 12px 0; display: block;';
      msg.textContent = error.message;
      emailInput.parentNode.insertBefore(msg, emailInput.nextSibling);
      btn.disabled = false;
      btn.textContent = 'Send Code';
    } else {
      setTimeout(function() {
        window.location.href = 'code_sent.html';
      }, 1000);
    }
  });
}

function showMessage(msg, isError) {
  const existing = document.getElementById('formMessage');
  if (existing) existing.remove();
  
  const msgEl = document.createElement('div');
  msgEl.id = 'formMessage';
  const color = isError ? '#dc3545' : '#28a745';
  msgEl.style.cssText = 'color: ' + color + '; font-size: 0.875rem; margin: 4px 0 12px 0; display: block;';
  msgEl.textContent = msg;
  
  const btn = resetPassForm.querySelector('button');
  if (btn) btn.insertAdjacentElement('afterend', msgEl);
}
