(function() {
  'use strict';

  const LOGIN_PAGE = '/views/index.html';

  async function initAuthCheck() {
    if (!window.supabaseClient) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!window.supabaseClient) {
        console.warn('Supabase client not found, redirecting to login');
        redirectToLogin();
        return;
      }
    }

    const supabase      = window.supabaseClient;
    const allowEmployees = document.body && document.body.getAttribute('data-allow-employees') === 'true';

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        redirectToLogin();
        return;
      }

      // Use cached user type from login — skip the DB round trip
      const cachedType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
      if (cachedType) {
        if (!allowEmployees && cachedType !== 'admin') {
          redirectToLogin();
        }
        return;
      }

      // No cache — fall back to DB lookup
      const userInfo = await getUserInfo(session.user.email);

      if (!userInfo) {
        redirectToLogin();
        return;
      }

      if (!allowEmployees && userInfo.type !== 'admin') {
        redirectToLogin();
      }

    } catch (e) {
      console.error('Auth check failed:', e);
      redirectToLogin();
    }
  }

  async function getUserInfo(email) {
    const supabase = window.supabaseClient;

    try {
      const [adminResult, empResult] = await Promise.all([
        supabase.from('user_admin_data').select('adminId, email').eq('email', email).maybeSingle(),
        supabase.from('user_employee_data').select('employeeId, email').eq('email', email).maybeSingle()
      ]);

      if (adminResult.data) return { id: adminResult.data.adminId, type: 'admin' };
      if (empResult.data)   return { id: empResult.data.employeeId, type: 'employee' };
      return null;
    } catch (e) {
      console.error('Error getting user info:', e);
      return null;
    }
  }

  function redirectToLogin() {
    if (window.top && window.top !== window) {
      window.top.location.href = LOGIN_PAGE;
    } else {
      window.location.href = LOGIN_PAGE;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthCheck);
  } else {
    initAuthCheck();
  }
})();
