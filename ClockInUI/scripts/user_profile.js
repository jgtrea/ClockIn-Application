document.addEventListener("DOMContentLoaded", () => {
  const firebaseConfig = {
    apiKey: "AIzaSyDUnpdDMr0E6r-lohCNJKKKdUJfbVqzayM",
    authDomain: "clockin-project-db.firebaseapp.com",
    projectId: "clockin-project-db",
    storageBucket: "clockin-project-db.firebasestorage.app",
    messagingSenderId: "144733710358",
    appId: "1:144733710358:web:5064e74d72052cded4ed37"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // DOM Elements
  const sidebar = document.getElementById("sidebar");
  const hamburger = document.getElementById("hamburger");
  const sidebarLogout = document.getElementById("sidebarLogout");

  const avatar = document.getElementById("avatar");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const username = document.getElementById("username");
  const emailField = document.getElementById("emailField");
  const organization = document.getElementById("organization");
  const department = document.getElementById("department");
  const passwordField = document.getElementById("passwordField");

  sidebar.classList.add("collapsed");
  hamburger.addEventListener("click", () => sidebar.classList.toggle("collapsed"));

  // Firebase Auth state listener
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "login.html";

    const displayName = user.displayName || user.email.split("@")[0];
    avatar.textContent = displayName.charAt(0).toUpperCase();
    nameEl.textContent = displayName;
    emailEl.textContent = user.email;
    username.textContent = displayName;
    emailField.textContent = user.email;

    const docRef = db.collection("users").doc(user.uid);
    const docSnap = await docRef.get();

    // To create default Firestore doc if not existing
    if (!docSnap.exists) {
      await docRef.set({
        organization: "",
        department: "",
        passwordLength: 12
      });
    }

    const data = (await docRef.get()).data();
    organization.textContent = data.organization || "Add organization";
    department.textContent = data.department || "Add department";
    passwordField.textContent = "*".repeat(data.passwordLength || 12);
  });

  sidebarLogout.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
  });

  const editButtons = document.querySelectorAll(".edit");
  const fields = ["username", "emailField", "password", "organization", "department"];

  async function handleEdit(field) {
    const user = auth.currentUser;
    if (!user) return;

    let currentValue;
    switch(field) {
      case "username": currentValue = username.textContent; break;
      case "emailField": currentValue = emailField.textContent; break;
      case "password": currentValue = ""; break;
      case "organization": currentValue = organization.textContent; break;
      case "department": currentValue = department.textContent; break;
    }

    const newValue = prompt(`Edit ${field}`, currentValue);
    if (!newValue) return;

    const docRef = db.collection("users").doc(user.uid);

    try {
      switch(field) {
        case "username":
          username.textContent = newValue;
          nameEl.textContent = newValue;
          await user.updateProfile({ displayName: newValue });
          break;

        case "emailField":
          emailField.textContent = newValue;
          emailEl.textContent = newValue;
          await user.updateEmail(newValue);
          break;

        case "password":
          await user.updatePassword(newValue);
          passwordField.textContent = "*".repeat(newValue.length);
          await docRef.set({ passwordLength: newValue.length }, { merge: true });
          alert("Password updated successfully!");
          break;

        case "organization":
          organization.textContent = newValue;
          await docRef.set({ organization: newValue }, { merge: true });
          break;

        case "department":
          department.textContent = newValue;
          await docRef.set({ department: newValue }, { merge: true });
          break;
      }
    } catch (err) {
      alert(`Failed to update ${field}: ${err.message}`);
    }
  }

  editButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => handleEdit(fields[index]));
  });
});
