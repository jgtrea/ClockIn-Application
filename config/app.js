/**
 * config/app.js
 * Shell application init: sidebar toggle, profile menu, logout, session display.
 * Loaded by index_admin.html and index_user.html.
 */

const App = {

  /**
   * Boot the shell. Call after DOMContentLoaded.
   */
  init() {
    this._bindHamburger();
    this._bindProfileMenu();
    this._bindLogout();
    this._loadProfile();
  },

  // ── Sidebar hamburger ───────────────────────────────────────────────────

  _bindHamburger() {
    const sidebar   = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');
    if (!hamburger || !sidebar) return;

    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('expanded');
      sidebar.classList.toggle('collapsed');
    });
  },

  // ── Profile dropdown ────────────────────────────────────────────────────

  _bindProfileMenu() {
    const circle = document.getElementById('profileCircle');
    const menu   = document.getElementById('profileMenu');
    if (!circle || !menu) return;

    circle.addEventListener('click', e => {
      e.stopPropagation();
      menu.classList.toggle('show');
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.profile-wrapper')) {
        menu.classList.remove('show');
      }
    });
  },

  // ── Logout ──────────────────────────────────────────────────────────────

  _bindLogout() {
    const doLogout = async e => {
      e.preventDefault();
      const supabase = window.supabaseClient;
      if (supabase) await supabase.auth.signOut();
      ['userEmail', 'userId', 'userType'].forEach(k => {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      });
      // window.top handles both shell and any lingering iframe context
      window.top.location.href = '../index.html';
    };

    document.getElementById('logoutBtn')?.addEventListener('click', doLogout);
    document.getElementById('sidebarLogout')?.addEventListener('click', doLogout);
  },

  // ── Session / profile display ───────────────────────────────────────────

  async _loadProfile() {
    const supabase = await this._waitForSupabase();
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const email = session.user.email;
      let displayName = session.user.user_metadata?.displayName || email.split('@')[0];

      // Try to get the employee display name from DB
      const { data } = await supabase
        .from('user_employee_data')
        .select('name')
        .eq('email', email)
        .maybeSingle();
      if (data?.name) displayName = data.name;

      this._renderProfile(displayName, email);

      // Sign-out hook: redirect to login when session ends
      supabase.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') {
          window.top.location.href = '../index.html';
        }
      });

    } catch (err) {
      console.error('[App] Failed to load profile:', err);
    }
  },

  _renderProfile(displayName, email) {
    const letter = displayName.charAt(0).toUpperCase();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('profileCircle',     letter);
    set('profileCircleMenu', letter);
    set('profileName',       displayName);
    set('profileEmail',      email);
  },

  // Wait up to 5 s for supabase to be ready
  _waitForSupabase(maxMs = 5000) {
    return new Promise(resolve => {
      if (window.supabaseClient) { resolve(window.supabaseClient); return; }
      const interval = 100;
      let elapsed = 0;
      const timer = setInterval(() => {
        elapsed += interval;
        if (window.supabaseClient) { clearInterval(timer); resolve(window.supabaseClient); }
        else if (elapsed >= maxMs)  { clearInterval(timer); resolve(null); }
      }, interval);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
