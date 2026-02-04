console.log('scripts/login.js loaded');

const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

window.supabaseClient = supabaseClient;

async function getUserIdByEmail(email) {
  const { data: adminData, error: adminError } = await supabaseClient
    .from('user_admin_data')
    .select('adminid, email')
    .eq('email', email)
    .single();
  
  if (!adminError && adminData) {
    return { id: adminData.adminid, type: 'admin' };
  }
  
  const { data: empData, error: empError } = await supabaseClient
    .from('user_employee_data')
    .select('employeeid, email')
    .eq('email', email)
    .single();
  
  if (!empError && empData) {
    return { id: empData.employeeid, type: 'employee' };
  }
  
  return null;
}

async function checkExistingSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const email = session.user.email;
      const userInfo = await getUserIdByEmail(email);
      if (userInfo && userInfo.type === 'admin') {
        window.location.href = '../Admin_ClockIn/index.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }
    }
  } catch (e) {
    console.error('Error checking session:', e);
  }
}

function setupAuthListener() {
  return supabaseClient.auth.onAuthStateChanged(async (event, session) => {
    console.log('onAuthStateChanged ->', event, session);

    if (session && session.user) {
      try {
        const userInfo = await getUserIdByEmail(session.user.email);

        if (userInfo && userInfo.type === 'admin') {
          window.location.href = '../Admin_ClockIn/index.html';
        } else {
          window.location.href = '../User_ClockIn/index_user.html';
        }
      } catch (e) {
        console.error('Privilege check failed', e);
        window.location.href = '../User_ClockIn/index_user.html';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAuthListener();
  checkExistingSession();
});

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    const rememberCheckbox = document.querySelector('input[name="remember"]');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        throw authError;
      }

      const userInfo = await getUserIdByEmail(email);

      if (!userInfo) {
        throw new Error('User not found in system');
      }

      const isAdmin = userInfo.type === 'admin';
      const storageKey = remember ? localStorage : sessionStorage;
      storageKey.setItem('userEmail', email);
      storageKey.setItem('userType', isAdmin ? 'admin' : 'employee');
      storageKey.setItem('userId', userInfo.id);

      if (isAdmin) {
        window.location.href = '../Admin_ClockIn/index.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }

    } catch (err) {
      console.error('Login failed', err);
      alert('Login failed. Please check your email and password.');
    }
  });
}
