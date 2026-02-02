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

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
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

async function isUserAdmin(email) {
  const q = query(
    collection(db, 'user_admin_data'),
    where('email', '==', email)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

onAuthStateChanged(auth, async (user) => {
  console.log('onAuthStateChanged ->', user);

  if (user) {
    try {
      const isAdmin = await isUserAdmin(user.email);

      if (isAdmin) {
        window.location.href = '../Admin_ClockIn/index.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }
    } catch (e) {
      console.error('Privilege check failed', e);
      window.location.href = '../User_ClockIn/index_user.html';
    }
  }
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

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      let isAdmin = false;
      try {
        isAdmin = await isUserAdmin(user.email);
      } catch (e) {
        console.error('Privilege check failed', e);
      }

      const storageKey = remember ? localStorage : sessionStorage;
      storageKey.setItem('userEmail', user.email);
      storageKey.setItem('userType', isAdmin ? 'admin' : 'employee');

      if (isAdmin) {
        window.location.href = '../Admin_ClockIn/index.html';
      } else {
        window.location.href = '../User_ClockIn/index_user.html';
      }

    } catch (err) {
      console.error('Login failed', err);
      alert('Login failed. Please check your email and password.');
    }
  });
}
