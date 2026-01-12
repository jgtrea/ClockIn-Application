console.log('scripts/register.js loaded');

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUnpdDMr0E6r-lohCNJKKKdUJfbVqzayM",
  authDomain: "clockin-project-db.firebaseapp.com",
  projectId: "clockin-project-db",
  storageBucket: "clockin-project-db.firebasestorage.app",
  messagingSenderId: "144733710358",
  appId: "1:144733710358:web:5064e74d72052cded4ed37",
  measurementId: "G-XNS00KPGZ6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const registerForm = document.getElementById('registerForm');

onAuthStateChanged(auth, (user) => {
  console.log('onAuthStateChanged ->', user);
});

if (registerForm) {
  registerForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created:', user);

      await setDoc(doc(db, "users", user.uid), {
        username: username,
        email: email
      });

      alert("Successfully created!");
      window.location.href = "login.html";

    } catch (err) {
      console.error('Registration failed:', err);
      const code = err && err.code ? err.code : 'unknown-error';
      const message = err && err.message ? err.message : String(err);
      alert(`Registration failed: ${code} — ${message}`);
    }
  });
}
