const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const resetCodeForm = document.getElementById('resetCodeForm');
if (resetCodeForm) {
  resetCodeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const btn = resetCodeForm.querySelector('button');
    
    if (!email) return alert('Please enter your email');
    
    sessionStorage.setItem('resetEmail', email);
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: false }
    });
    
    if (error) return alert('Failed to send code: ' + error.message);
    
    document.getElementById('codeSection').style.display = 'block';
    document.getElementById('sendBtn').style.display = 'none';
    document.getElementById('proceedBtn').style.display = 'block';
    document.getElementById('userEmail').textContent = email;
    alert('Code sent! Check your email.');
  });
}

const resetPassForm = document.getElementById('resetPassForm');
if (resetPassForm) {
  document.getElementById('email').value = sessionStorage.getItem('resetEmail') || '';
  
  resetPassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const code = document.getElementById('code').value.trim();
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const btn = resetPassForm.querySelector('button');
    
    if (!code || !newPass || !confirmPass) return alert('Fill all fields');
    if (newPass !== confirmPass) return alert('Passwords do not match');
    if (newPass.length < 8) return alert('Password must be at least 8 characters');
    
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    
    const { error: verifyError } = await supabaseClient.auth.verifyOtp({ email, token: code, type: 'email' });
    if (verifyError) return alert('Invalid code'), btn.disabled = false, btn.textContent = 'Reset Password';
    
    btn.textContent = 'Resetting...';
    const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPass });
    
    if (updateError) return alert('Failed to reset: ' + updateError.message), btn.disabled = false;
    
    sessionStorage.removeItem('resetEmail');
    alert('Password reset! Login with new password.');
    window.location.href = '../login.html';
  });
}
