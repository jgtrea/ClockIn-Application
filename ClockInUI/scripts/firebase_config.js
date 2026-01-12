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

window.auth = firebase.auth();
window.db = null;

console.log('firebase namespace keys:', Object.keys(firebase));

function initFirestoreCompat() {
  try {
    if (typeof firebase.firestore === 'function') {
      window.db = firebase.firestore();
      console.log('Firestore initialized (compat).');
      return;
    }
  } catch (e) {
    console.warn('firebase.firestore test threw', e);
  }

  const scriptUrl = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
  console.log('Loading firestore compat dynamically from', scriptUrl);
  const s = document.createElement('script');
  s.src = scriptUrl;
  s.onload = () => {
    try {
      if (typeof firebase.firestore === 'function') {
        window.db = firebase.firestore();
        console.log('Firestore compat loaded and initialized.');
      } else {
        console.error('Loaded firestore-compat but firebase.firestore is still not a function.');
      }
    } catch (err) {
      console.error('Error initializing firestore after loading compat script', err);
    }
  };
  s.onerror = (err) => console.error('Failed to load firestore-compat script', err);
  document.head.appendChild(s);
}

initFirestoreCompat();