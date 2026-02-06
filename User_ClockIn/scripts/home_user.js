const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");

if (sidebar && hamburger) {
  sidebar.classList.add("collapsed");
  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("expanded");
    sidebar.classList.toggle("collapsed");
  });
}

const profileCircle = document.getElementById("profileCircle");
const profileCircleMenu = document.getElementById("profileCircleMenu");
const profileMenu = document.getElementById("profileMenu");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const logoutBtn = document.getElementById("logoutBtn");
const sidebarLogout = document.getElementById("sidebarLogout");

if (profileCircle && profileMenu) {
  profileCircle.addEventListener("click", () => {
    profileMenu.classList.toggle("show");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-wrapper")) {
      profileMenu.classList.remove("show");
    }
  });
}

const supabase = window.supabaseClient;

if (supabase) {
  supabase.auth.onAuthStateChanged(async (event, session) => {
    if (!session) {
      const userEmail = sessionStorage.getItem('userEmail') || localStorage.getItem('userEmail');
      if (userEmail) {
        const displayName = userEmail.split('@')[0];
        const letter = displayName.charAt(0).toUpperCase();
        if (profileCircle) profileCircle.textContent = letter;
        if (profileCircleMenu) profileCircleMenu.textContent = letter;
        if (profileName) profileName.textContent = displayName;
        if (profileEmail) profileEmail.textContent = userEmail;
        return;
      }
      window.location.href = "../../Login_Path/login.html";
      return;
    }

    const user = session.user;
    const displayName = user.user_metadata?.displayName || user.email.split("@")[0];
    const letter = displayName.charAt(0).toUpperCase();

    if (profileCircle) profileCircle.textContent = letter;
    if (profileCircleMenu) profileCircleMenu.textContent = letter;
    if (profileName) profileName.textContent = displayName;
    if (profileEmail) profileEmail.textContent = user.email;
  });
}

async function logout() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('userEmail');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('userType');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userId');
  localStorage.removeItem('userType');
  if (window.top !== window.self) {
    window.top.location.href = "../../Login_Path/login.html";
  } else {
    window.location.href = "../../Login_Path/login.html";
  }
}

if (logoutBtn) logoutBtn.addEventListener("click", logout);
if (sidebarLogout) sidebarLogout.addEventListener("click", logout);

function setActive(element) {
  const menuItems = document.querySelectorAll(".menu a");
  menuItems.forEach(item => item.classList.remove("active"));
  element.classList.add("active");
}
