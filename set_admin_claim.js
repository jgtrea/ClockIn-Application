const admin = require('firebase-admin');
const path = require('path');
const keyPath = path.join(__dirname, 'serviceAccountKey.json');

try {
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (err) {
  console.error('Failed to load service account key from', keyPath);
  console.error('Place your service account JSON at that path or update the script.');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node set_admin_claim.js user@example.com');
  process.exit(1);
}

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('Admin claim set for', email, 'uid=', user.uid);
    console.log('The user must sign out and sign in again to receive updated token claims.');
    process.exit(0);
  } catch (err) {
    console.error('Error setting admin claim:', err);
    process.exit(1);
  }
})();
