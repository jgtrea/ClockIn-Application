async function getUserIdByEmail(email) {
  const supabase = window.supabaseClient;

  const [adminResult, empResult] = await Promise.all([
    supabase.from('user_admin_data').select('adminId, email').eq('email', email).maybeSingle(),
    supabase.from('user_employee_data').select('employeeId, email').eq('email', email).maybeSingle()
  ]);

  if (adminResult.data) return { id: adminResult.data.adminId, type: 'admin' };
  if (empResult.data)  return { id: empResult.data.employeeId, type: 'employee' };
  return null;
}

async function checkExistingSession() {
  const supabase = window.supabaseClient;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      const userInfo = await getUserIdByEmail(session.user.email);
      if (userInfo && userInfo.type === 'admin') {
        window.location.href = '/views/admin_clockin/index_admin.html';
      } else {
        window.location.href = '/views/user_clockin/index_user.html';
      }
    }
  } catch (e) {
    console.error('Error checking session:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkExistingSession();
});

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showAlertPrompt('Please fill in all fields.');
      return;
    }

    const rememberCheckbox = document.querySelector('input[name="remember"]');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    try {
      const supabase = window.supabaseClient;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) throw authError;

      const userInfo = await getUserIdByEmail(email);

      if (!userInfo) throw new Error('User not found in system');

      const isAdmin     = userInfo.type === 'admin';
      const storageKey  = remember ? localStorage : sessionStorage;
      storageKey.setItem('userEmail', email);
      storageKey.setItem('userType', isAdmin ? 'admin' : 'employee');
      storageKey.setItem('userId', userInfo.id);

      window.location.href = isAdmin
        ? '/views/admin_clockin/index_admin.html'
        : '/views/user_clockin/index_user.html';

    } catch (err) {
      console.error('Login failed', err);
      showAlertPrompt('Login failed. Please check your email and password.');
    }
  });
}
