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
    
    if (!this.client) {
      this.init();
    }

    try {
      const { data: { session }, error } = await this.client.auth.getSession();

      if (error || !session) {
        this.redirectToLogin();
        return false;
      }

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
      const { data: adminData, error: adminError } = await this.client
        .from('user_admin_data')
        .select('adminId, email')
        .eq('email', email)
        .single();

      if (!adminError && adminData) {
        return { id: adminData.adminId, type: 'admin' };
      }

      const { data: empData, error: empError } = await this.client
        .from('user_employee_data')
        .select('employeeId, email')
        .eq('email', email)
        .single();

      if (!empError && empData) {
        return { id: empData.employeeId, type: 'employee' };
      }

      return null;
    } catch (e) {
      return null;
    }
  },

  redirectToLogin() {
    window.location.href = '../index.html';
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
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const allowEmployees = document.body.getAttribute('data-allow-employees') === 'true';
  
  await authentication.checkAuth({ adminOnly: !allowEmployees });
});
