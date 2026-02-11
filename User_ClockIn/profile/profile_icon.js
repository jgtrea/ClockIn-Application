document.addEventListener('DOMContentLoaded', () => {
  const profileCircle = document.getElementById('profileCircle');
  const profileMenu = document.getElementById('profileMenu');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileCircleMenu = document.getElementById('profileCircleMenu');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!profileCircle) return;

  class ProfileManager {
    constructor() {
      this.supabase = window.supabaseClient;
    }

    init() {
      this.setupProfileMenu();
      this.setupLogout();
      this.loadUserSession();
      this.setupProfileUpdateListener();
    }

    setupProfileUpdateListener() {
      window.addEventListener('profileUpdated', (e) => {
        const newName = e.detail.name;
        const letter = newName.charAt(0).toUpperCase();
        profileCircle.textContent = letter;
        profileCircleMenu.textContent = letter;
        profileName.textContent = newName;
      });
    }

    async loadUserSession() {
      if (!this.supabase) {
        setTimeout(() => this.loadUserSession(), 100);
        return;
      }

      try {
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (session && session.user) {
          const email = session.user.email;
          let displayName = session.user.user_metadata?.displayName || email.split('@')[0];
          
          const { data: empData } = await this.supabase.from('user_employee_data').select('name').eq('email', email).maybeSingle();
          if (empData?.name) {
            displayName = empData.name;
          }
          
          const letter = displayName.charAt(0).toUpperCase();
          
          profileCircle.textContent = letter;
          profileCircleMenu.textContent = letter;
          profileName.textContent = displayName;
          profileEmail.textContent = email;
        } else {
          const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
          profileCircle.textContent = '?';
          profileCircleMenu.textContent = '?';
          profileName.textContent = 'Guest';
          profileEmail.textContent = userEmail || '';
        }

        this.supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            window.location.reload();
          } else if (event === 'SIGNED_OUT') {
            window.top.location.href = '../../index.html';
          }
        });
      } catch (err) {
        console.error('Failed to load session:', err);
      }
    }

    setupProfileMenu() {
      profileCircle.onclick = () => {
        profileMenu.classList.toggle('show');
      };

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-wrapper')) {
          profileMenu.classList.remove('show');
        }
      });
    }

    setupLogout() {
      logoutBtn.onclick = async () => {
        if (this.supabase) {
          await this.supabase.auth.signOut();
        }
        sessionStorage.removeItem('userEmail');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userType');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('userType');
        window.top.location.href = '../../index.html';
      };
    }
  }

  window.ProfileManager = ProfileManager;

  const profileManager = new ProfileManager();
  profileManager.init();
});
