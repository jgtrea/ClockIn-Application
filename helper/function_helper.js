// ── Timestamp utilities ───────────────────────────────────────────────────────

function parseDatabaseTimestamp(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;

  const str = String(timestamp);
  const hasTimezone = /[+-]\d{2}:?\d{2}$/.test(str);

  if (hasTimezone) {
    const dateTimePart = str.replace(/[+-]\d{2}:?\d{2}$/, '').replace('T', ' ');
    const [datePart, timePart = '00:00:00'] = dateTimePart.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  return new Date(str.replace('T', ' '));
}

function formatTimeFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeFromDB24(timestamp) {
  if (!timestamp) return '';
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour12: false }).split(' ')[0];
}

function getDateFromDB(timestamp) {
  if (!timestamp) return null;
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function formatDateFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTimeFromDB(timestamp) {
  if (!timestamp) return 'N/A';
  const date = parseDatabaseTimestamp(timestamp);
  if (!date || isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Supabase session utilities ────────────────────────────────────────────────

async function waitForSupabase() {
  let client = window.supabaseClient;
  let attempts = 0;
  while (!client && attempts < 50) {
    await new Promise(r => setTimeout(r, 100));
    client = window.supabaseClient;
    attempts++;
  }
  return client;
}

async function getSession() {
  const client = await waitForSupabase();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

// ── Profile display helpers ───────────────────────────────────────────────────

function updateProfileDisplay(user) {
  const circle     = document.getElementById('profileCircle');
  const circleMenu = document.getElementById('profileCircleMenu');
  const nameEl     = document.getElementById('profileName');
  const emailEl    = document.getElementById('profileEmail');

  const displayName = user?.user_metadata?.displayName || user?.email?.split('@')[0] || 'User';
  const letter = displayName.charAt(0).toUpperCase();

  if (circle)     circle.textContent     = letter;
  if (circleMenu) circleMenu.textContent = letter;
  if (nameEl)     nameEl.textContent     = displayName;
  if (emailEl)    emailEl.textContent    = user?.email || '';
}

function loadFromStorage() {
  const circle     = document.getElementById('profileCircle');
  const circleMenu = document.getElementById('profileCircleMenu');
  const nameEl     = document.getElementById('profileName');
  const emailEl    = document.getElementById('profileEmail');

  const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  if (!userEmail) return;

  const displayName = userEmail.split('@')[0];
  const letter = displayName.charAt(0).toUpperCase();

  if (circle)     circle.textContent     = letter;
  if (circleMenu) circleMenu.textContent = letter;
  if (nameEl)     nameEl.textContent     = displayName;
  if (emailEl)    emailEl.textContent    = userEmail;
}

async function loadUserProfile() {
  const user = await getCurrentUser();
  if (user) updateProfileDisplay(user);
  else loadFromStorage();
}

async function logout(redirectPath = '../index.html') {
  const client = await waitForSupabase();
  if (client) await client.auth.signOut();
  ['userEmail', 'userId', 'userType'].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
  window.location.href = redirectPath;
}

function setupProfileMenu() {
  const circle  = document.getElementById('profileCircle');
  const menu    = document.getElementById('profileMenu');
  const logoutBtn = document.getElementById('logoutBtn');

  if (circle && menu) {
    circle.addEventListener('click', () => menu.classList.toggle('show'));
    document.addEventListener('click', e => {
      if (!e.target.closest('.profile-wrapper')) menu.classList.remove('show');
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', () => logout());
}

function setupAuthListener() {
  const client = window.supabaseClient;
  if (!client) return;
  client.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      updateProfileDisplay(session.user);
      window.location.reload();
    } else if (event === 'SIGNED_OUT') {
      loadFromStorage();
    }
  });
}

async function loadEmployeeData(email, selectFields = '*') {
  const client = await waitForSupabase();
  if (!client) return null;
  const { data, error } = await client
    .from('user_employee_data')
    .select(selectFields)
    .eq('email', email)
    .single();
  if (error) { console.error('Error loading employee data:', error); return null; }
  return data;
}

// ── Expose on window ──────────────────────────────────────────────────────────

window.timestampUtils = {
  parseDatabaseTimestamp,
  formatTimeFromDB,
  formatTimeFromDB24,
  getDateFromDB,
  formatDateFromDB,
  formatDateTimeFromDB
};

window.UserShared = {
  waitForSupabase,
  getSession,
  getCurrentUser,
  updateProfileDisplay,
  loadFromStorage,
  loadUserProfile,
  logout,
  setupProfileMenu,
  setupAuthListener,
  loadEmployeeData
};
