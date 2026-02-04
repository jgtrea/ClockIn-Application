console.log('scripts/login.js loaded');

const supabaseUrl = 'https://ckgvtzsslrxklmbkztxe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo';

const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

window.supabaseClient = supabaseClient;

async function isUserAdmin(email) {
  try {
    const { data, error } = await supabaseClient
      .from('user_admin_data')
      .select('adminid')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking admin status:', error);
      return false;
    }
    return !!data;
  } catch (e) {
    console.error('Error in isUserAdmin:', e);
    return false;
  }
}

async function checkExistingSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const email = session.user.email;
      const isAdmin = await isUserAdmin(email);
      if (isAdmin) {
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
        const isAdmin = await isUserAdmin(session.user.email);

        if (isAdmin) {
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
      const { data: adminData, error: adminError } = await supabaseClient
        .from('user_admin_data')
        .select('adminid, email, pass')
        .eq('email', email)
        .single();

      let isAdmin = false;
      let userData = null;

      if (!adminError && adminData) {
        if (adminData.pass !== password) {
          throw new Error('Invalid password');
        }
        isAdmin = true;
        userData = { adminId: adminData.adminid, email: adminData.email, pass: adminData.pass };
      } else {
        const { data: empData, error: empError } = await supabaseClient
          .from('user_employee_data')
          .select('employeeid, email, pass')
          .eq('email', email)
          .single();

        if (empError || !empData) {
          throw new Error('User not found');
        }

        if (empData.pass !== password) {
          throw new Error('Invalid password');
        }
        userData = { employeeId: empData.employeeid, email: empData.email, pass: empData.pass };
      }

      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.log('Supabase Auth note:', authError.message);
      }

      const storageKey = remember ? localStorage : sessionStorage;
      storageKey.setItem('userEmail', email);
      storageKey.setItem('userType', isAdmin ? 'admin' : 'employee');
      storageKey.setItem('userId', isAdmin ? userData.adminId : userData.employeeId);

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
