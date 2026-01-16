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

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const displayName = user.displayName || user.email.split("@")[0];
  const letter = displayName.charAt(0).toUpperCase();

  if (profileCircle) profileCircle.textContent = letter;
  if (profileCircleMenu) profileCircleMenu.textContent = letter;
  if (profileName) profileName.textContent = displayName;
  if (profileEmail) profileEmail.textContent = user.email;
});

async function logout() {
  await auth.signOut();
  if (window.top !== window.self) {
    window.top.location.href = "login.html";
  } else {
    window.location.href = "login.html";
  }
}

if (logoutBtn) logoutBtn.addEventListener("click", logout);
if (sidebarLogout) sidebarLogout.addEventListener("click", logout);
