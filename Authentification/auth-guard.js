/**
 * Auth Guard - Protects pages from unauthorized access
 * Include this script in all pages to ensure user is logged in
 * 
 * Usage:
 * - For admin pages: <script src="../Authentification/auth-guard.js"></script>
 * - For user pages: <script src="../Authentification/auth-guard.js"></script>
 *   then add <body data-allow-employees="true">
 */

(function() {
  'use strict';

  const LOGIN_PAGE = '../index.html';

  // Wait for DOM and supabase to be ready
  async function initAuthCheck() {
    // Wait for supabase client
    if (!window.supabaseClient) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!window.supabaseClient) {
        console.warn('Supabase client not found, redirecting to login');
        redirectToLogin();
        return;
      }
    }

    const supabase = window.supabaseClient;
    const allowEmployees = document.body && document.body.getAttribute('data-allow-employees') === 'true';

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        console.log('No session found, redirecting to login');
        redirectToLogin();
        return;
      }

      // Verify user exists in the database
      const userInfo = await getUserInfo(session.user.email);
      
      if (!userInfo) {
        console.log('User not found in system, redirecting to login');
        redirectToLogin();
        return;
      }

      // Check if user has appropriate role
      if (!allowEmployees && userInfo.type !== 'admin') {
        console.log('Admin access required, redirecting to login');
        redirectToLogin();
        return;
      }

      // User is authenticated
      console.log('User authenticated:', userInfo.type);
      
    } catch (e) {
      console.error('Auth check failed:', e);
      redirectToLogin();
    }
  }

  async function getUserInfo(email) {
    const supabase = window.supabaseClient;

    try {
      // Check admin table first
      const { data: adminData, error: adminError } = await supabase
        .from('user_admin_data')
        .select('adminId, email')
        .eq('email', email)
        .single();

      if (!adminError && adminData) {
        return { id: adminData.adminId, type: 'admin' };
      }

      // Check employee table
      const { data: empData, error: empError } = await supabase
        .from('user_employee_data')
        .select('employeeId, email')
        .eq('email', email)
        .single();

      if (!empError && empData) {
        return { id: empData.employeeId, type: 'employee' };
      }

      return null;
    } catch (e) {
      console.error('Error getting user info:', e);
      return null;
    }
  }

  function redirectToLogin() {
    // Use top.location to redirect the parent window if in iframe
    if (window.top && window.top !== window) {
      window.top.location.href = LOGIN_PAGE;
    } else {
      window.location.href = LOGIN_PAGE;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthCheck);
  } else {
    initAuthCheck();
  }
})();
