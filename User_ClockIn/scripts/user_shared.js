async function waitForSupabase() {
  let supabase = window.supabaseClient;
  let attempts = 0;
  while (!supabase && attempts < 50) {
    await new Promise(r => setTimeout(r, 100));
    supabase = window.supabaseClient;
    attempts++;
  }
  return supabase;
}

async function getSession() {
  const supabase = await waitForSupabase();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

function updateProfileDisplay(user) {
  const profileCircle = document.getElementById("profileCircle");
  const profileCircleMenu = document.getElementById("profileCircleMenu");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  
  const displayName = user?.user_metadata?.displayName || user?.email?.split("@")[0] || "User";
  const letter = displayName.charAt(0).toUpperCase();
  
  if (profileCircle) profileCircle.textContent = letter;
  if (profileCircleMenu) profileCircleMenu.textContent = letter;
  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = user?.email || "";
}

function loadFromStorage() {
  const profileCircle = document.getElementById("profileCircle");
  const profileCircleMenu = document.getElementById("profileCircleMenu");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  
  const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
  if (!userEmail) return;
  
  const displayName = userEmail.split('@')[0];
  const letter = displayName.charAt(0).toUpperCase();
  
  if (profileCircle) profileCircle.textContent = letter;
  if (profileCircleMenu) profileCircleMenu.textContent = letter;
  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = userEmail;
}

async function loadUserProfile() {
  const user = await getCurrentUser();
  if (user) {
    updateProfileDisplay(user);
  } else {
    loadFromStorage();
  }
}

async function logout() {
  const supabase = await waitForSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userType');
  window.location.href = '../../index.html';
}

function setupProfileMenu() {
  const profileCircle = document.getElementById("profileCircle");
  const profileMenu = document.getElementById("profileMenu");
  const logoutBtn = document.getElementById("logoutBtn");

  if (profileCircle && profileMenu) {
    profileCircle.addEventListener("click", () => profileMenu.classList.toggle("show"));
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".profile-wrapper")) profileMenu.classList.remove("show");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

function setupAuthListener() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      updateProfileDisplay(session.user);
      window.location.reload();
    } else if (event === 'SIGNED_OUT') {
      loadFromStorage();
    }
  });
}

async function loadEmployeeData(email, selectFields = '*') {
  const supabase = await waitForSupabase();
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_employee_data')
    .select(selectFields)
    .eq('email', email)
    .single();
  
  if (error) {
    console.error('Error loading employee data:', error);
    return null;
  }
  return data;
}

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
