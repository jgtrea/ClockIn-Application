async function getUserIdByEmail(email) {
  const supabase = window.supabaseClient;
  
  const { data: adminData, error: adminError } = await supabase
    .from('user_admin_data')
    .select('adminId, email')
    .eq('email', email)
    .single();
  
  if (!adminError && adminData) {
    return { id: adminData.adminId, type: 'admin' };
  }
  
  const { data: empData, error: empError } = await supabase
    .from('user_employee_data')
    .select('employeeId, email')
    .eq('email', email)
    .single();
  
  if (!empError && empData) {
    return { id: empData.employeeId, type: 'employee' };
  }
  
  return null;
}

async function checkExistingSession() {
  const supabase = window.supabaseClient;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const email = session.user.email;
      const userInfo = await getUserIdByEmail(email);
      if (userInfo && userInfo.type === 'admin') {
        window.location.href = '../Admin_ClockIn/index_admin.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }
    }
  } catch (e) {
    console.error('Error checking session:', e);
  }
}

function setupAuthListener() {
  const supabase = window.supabaseClient;
  
  return supabase.auth.onAuthStateChanged(async (event, session) => {
    if (session && session.user) {
      try {
        const userInfo = await getUserIdByEmail(session.user.email);

        if (userInfo && userInfo.type === 'admin') {
          window.location.href = '../Admin_ClockIn/index_admin.html';
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
      showAlertPrompt('Please fill in all fields.');
      return;
    }

    const rememberCheckbox = document.querySelector('input[name="remember"]');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    try {
      const supabase = window.supabaseClient;
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
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
        window.location.href = '../Admin_ClockIn/index_admin.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }

    } catch (err) {
      console.error('Login failed', err);
      showAlertPrompt('Login failed. Please check your email and password.');
    }
  });
}
