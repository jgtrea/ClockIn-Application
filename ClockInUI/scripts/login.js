console.log('scripts/login.js loaded');

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

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

onAuthStateChanged(auth, (user) => {
  console.log('onAuthStateChanged ->', user);
});

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    const rememberCheckbox = document.querySelector('input[name="remember"]');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;

    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      await signInWithEmailAndPassword(auth, email, password);

      alert('Login successful!');
      window.location.href = 'index.html';

    } catch (err) {
      console.error('Login failed', err);

      switch (err.code) {
        case 'auth/user-not-found':
          alert('No account exists with this email.');
          break;

        case 'auth/wrong-password':
          alert('Incorrect password.');
          break;

        case 'auth/invalid-email':
          alert('Invalid email format.');
          break;

        case 'auth/too-many-requests':
          alert('Too many failed attempts. Please try again later.');
          break;

        case 'auth/network-request-failed':
          alert('Network error. Please check your internet connection.');
          break;

        default:
          alert('Login failed.');
      }
    }
  });
}
