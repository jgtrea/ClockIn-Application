class ProfileManager {
  constructor() {
    this.supabase = window.supabaseClient;
    this.profileCircle = document.getElementById('profileCircle');
    this.profileMenu = document.getElementById('profileMenu');
    this.profileName = document.getElementById('profileName');
    this.profileEmail = document.getElementById('profileEmail');
    this.profileCircleMenu = document.getElementById('profileCircleMenu');
    this.logoutBtn = document.getElementById('logoutBtn');
  }

  init() {
    this.setupProfileMenu();
    this.setupLogout();
    this.loadUserSession();
  }

  async loadUserSession() {
    if (!this.supabase) {
      setTimeout(() => this.loadUserSession(), 100);
      return;
    }

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (error) {
        console.error('Session load error:', error);
        return;
      }

      if (session && session.user) {
        this.updateProfileDisplay(session.user);
      } else {
        this.resetProfileDisplay();
      }

      this.setupAuthStateListener();
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  }

  setupProfileMenu() {
    if (this.profileCircle && this.profileMenu) {
      this.profileCircle.addEventListener('click', () => {
        this.profileMenu.classList.toggle('show');
      });
      
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-wrapper')) {
          this.profileMenu.classList.remove('show');
        }
      });
    }
  }

  setupAuthStateListener() {
    if (this.supabase) {
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.updateProfileDisplay(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.resetProfileDisplay();
        }
      });
    }
  }

  updateProfileDisplay(user) {
    const displayName = user.user_metadata?.displayName || user.email.split('@')[0];
    const letter = displayName.charAt(0).toUpperCase();
    
    if (this.profileCircle) this.profileCircle.textContent = letter;
    if (this.profileCircleMenu) this.profileCircleMenu.textContent = letter;
    if (this.profileName) this.profileName.textContent = displayName;
    if (this.profileEmail) this.profileEmail.textContent = user.email;
  }

  resetProfileDisplay() {
    const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
    
    if (this.profileCircle) this.profileCircle.textContent = '?';
    if (this.profileCircleMenu) this.profileCircleMenu.textContent = '?';
    if (this.profileName) this.profileName.textContent = 'Guest';
    if (this.profileEmail) this.profileEmail.textContent = userEmail || '';
  }

  setupLogout() {
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', async () => {
        if (this.supabase) {
          await this.supabase.auth.signOut();
        }
        this.clearSession();
        window.top.location.href = '../Login_Path/login.html';
      });
    }
  }

  clearSession() {
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userType');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
  }
}

window.ProfileManager = ProfileManager;

document.addEventListener('DOMContentLoaded', () => {
  const profileManager = new ProfileManager();
  profileManager.init();
});
