const firebaseConfig = {
  apiKey: "AIzaSyDUnpdDMr0E6r-lohCNJKKKdUJfbVqzayM",
  authDomain: "clockin-project-db.firebaseapp.com",
  projectId: "clockin-project-db",
  storageBucket: "clockin-project-db.firebasestorage.app",
  messagingSenderId: "144733710358",
  appId: "1:144733710358:web:5064e74d72052cded4ed37"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const profileCircle = document.getElementById("profileCircle");
const profileCircleMenu = document.getElementById("profileCircleMenu");
const profileMenu = document.getElementById("profileMenu");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const logoutBtn = document.getElementById("logoutBtn");
const sidebarLogout = document.getElementById("sidebarLogout");

const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");

sidebar.classList.add("collapsed");

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

profileCircle.addEventListener("click", () => {
  profileMenu.classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-wrapper")) {
    profileMenu.classList.remove("show");
  }
});

auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const displayName = user.displayName || user.email.split("@")[0];
  const letter = displayName.charAt(0).toUpperCase();

  profileCircle.textContent = letter;
  profileCircleMenu.textContent = letter;
  profileName.textContent = displayName;
  profileEmail.textContent = user.email;
});

async function logout() {
  await auth.signOut();
  window.location.href = "login.html";
}

logoutBtn.addEventListener("click", logout);
sidebarLogout.addEventListener("click", logout);
