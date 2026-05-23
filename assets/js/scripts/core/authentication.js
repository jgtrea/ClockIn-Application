const authentication = {
  supabaseUrl: 'https://ckgvtzsslrxklmbkztxe.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3Z0enNzbHJ4a2xtYmt6dHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDc1NzQsImV4cCI6MjA4NTY4MzU3NH0.fhKTJOFPL5oxK3C1cRws-HM4aUSJEGK1Ei1W4sv5qCo',
  client: null,

  init() {
    if (window.supabaseClient) {
      this.client = window.supabaseClient;
    } else {
      const { createClient } = supabase;
      this.client = createClient(this.supabaseUrl, this.supabaseKey);
      window.supabaseClient = this.client;
    }
  },

  async checkAuth(options = {}) {
    const { adminOnly = true } = options;

    if (!this.client) this.init();

    try {
      const { data: { session }, error } = await this.client.auth.getSession();

      if (error || !session) {
        this.redirectToLogin();
        return false;
      }

      // Use cached user type from login — skip the DB round trip
      const cachedType = sessionStorage.getItem('userType') || localStorage.getItem('userType');
      if (cachedType) {
        if (adminOnly && cachedType !== 'admin') {
          this.redirectToLogin();
          return false;
        }
        return true;
      }

      // No cache — fall back to DB lookup
      const userInfo = await this.getUserIdByEmail(session.user.email);

      if (!userInfo) {
        this.redirectToLogin();
        return false;
      }

      if (adminOnly && userInfo.type !== 'admin') {
        this.redirectToLogin();
        return false;
      }

      return true;
    } catch (e) {
      this.redirectToLogin();
      return false;
    }
  },

  async getUserIdByEmail(email) {
    try {
      const [adminResult, empResult] = await Promise.all([
        this.client.from('user_admin_data').select('adminId, email').eq('email', email).maybeSingle(),
        this.client.from('user_employee_data').select('employeeId, email').eq('email', email).maybeSingle()
      ]);

      if (adminResult.data) return { id: adminResult.data.adminId, type: 'admin' };
      if (empResult.data)   return { id: empResult.data.employeeId, type: 'employee' };
      return null;
    } catch (e) {
      return null;
    }
  },

  redirectToLogin() {
    window.location.href = '/views/index.html';
  },

  async signOut() {
    try {
      await this.client.auth.signOut();
      this.redirectToLogin();
    } catch (e) {
      this.redirectToLogin();
    }
  }
};

window.authentication = authentication;

document.addEventListener('DOMContentLoaded', async () => {
  const allowEmployees = document.body.getAttribute('data-allow-employees') === 'true';
  await authentication.checkAuth({ adminOnly: !allowEmployees });
});
