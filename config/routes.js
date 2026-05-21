/**
 * config/routes.js
 * Central route definitions and iframe navigation for admin and user shells.
 */

// ── Route maps ────────────────────────────────────────────────────────────────

const AdminRoutes = [
  { name: 'Home',             url: 'home.html',                icon: 'home' },
  { name: 'Dashboard',        url: 'dashboard_db.html',        icon: 'dashboard' },
  { name: 'Users',            url: 'users_db.html',            icon: 'group' },
  { name: 'Schedule',         url: 'schedule_db.html',         icon: 'calendar_month' },
  { name: 'Section',          url: 'section_schedules.html',   icon: 'view_module' },
  { name: 'Attendance',       url: 'attendance_db.html',       icon: 'how_to_reg' },
  { name: 'Push Notification',url: 'push_notification.html',   icon: 'notifications_active' },
  { name: 'Feedback',         url: 'feedback.html',            icon: 'feedback' },
];

const UserRoutes = [
  { name: 'Home',          url: 'home_user.html',         icon: 'home' },
  { name: 'Check In/Out',  url: 'checkin_user.html',      icon: 'login' },
  { name: 'Schedule',      url: 'schedule_user.html',     icon: 'calendar_month' },
  { name: 'Attendance',    url: 'attendance_user.html',   icon: 'how_to_reg' },
  { name: 'Feedback',      url: 'feedback_user.html',     icon: 'feedback' },
  { name: 'Notifications', url: 'notification_user.html', icon: 'notifications' },
];

// ── Auth redirect destinations (relative to the shell page) ──────────────────

const AuthPaths = {
  login:  '../index.html',
  admin:  'admin_clockin/index_admin.html',  // relative from views/index.html
  user:   'user_clockin/index_user.html',    // relative from views/index.html
};

// ── Router ───────────────────────────────────────────────────────────────────

const Router = {
  _routes: [],
  _frameId: 'contentFrame',

  /**
   * Initialise the router with a route list.
   * Call once per shell page after DOMContentLoaded.
   */
  init(routes) {
    this._routes = routes;
    this._bindSidebarLinks();
    this._bindSearch();

    // Restore last active page (persists across reloads and redirects)
    const saved = localStorage.getItem('currentPage');
    if (saved && routes.some(r => r.url === saved)) {
      this.navigateTo(saved, { silent: true });
    }
  },

  /**
   * Load a page into the content iframe and update the active sidebar link.
   * @param {string} url       - filename, e.g. 'home.html'
   * @param {object} opts
   * @param {boolean} opts.silent - skip collapsing sidebar (used on init)
   */
  navigateTo(url, { silent = false } = {}) {
    const frame = document.getElementById(this._frameId);
    if (frame) frame.src = url;

    this._setActive(url);
    localStorage.setItem('currentPage', url);

    if (!silent) this._collapseSidebar();
  },

  // ── Private helpers ──────────────────────────────────────────────────────

  _setActive(url) {
    document.querySelectorAll('#sidebar a').forEach(link => {
      const linkUrl = link.getAttribute('data-url') || link.getAttribute('href');
      link.classList.toggle('active', linkUrl === url);
    });
  },

  _collapseSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.add('collapsed');
      sidebar.classList.remove('expanded');
    }
  },

  _bindSidebarLinks() {
    document.querySelectorAll('#sidebar nav a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const url = link.getAttribute('data-url') || link.getAttribute('href');
        if (url && url !== '#') this.navigateTo(url);
      });
    });
  },

  _bindSearch() {
    const input   = document.getElementById('sectionSearch');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!q) { results.classList.remove('show'); return; }

      const matches = this._routes.filter(r => r.name.toLowerCase().includes(q));

      results.innerHTML = matches.length
        ? matches.map(r => `
            <div class="search-result-item" data-url="${r.url}">
              <span class="material-symbols-outlined">${r.icon}</span>
              ${r.name}
            </div>`).join('')
        : '<div class="search-no-result">No results found</div>';

      results.classList.add('show');

      results.querySelectorAll('[data-url]').forEach(el => {
        el.addEventListener('click', () => {
          input.value = '';
          results.classList.remove('show');
          this.navigateTo(el.dataset.url);
        });
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.search-bar-wrapper')) {
        results.classList.remove('show');
      }
    });
  },
};

// Expose navigateTo globally so HTML onclick attributes still work
function navigateTo(url) { Router.navigateTo(url); }
