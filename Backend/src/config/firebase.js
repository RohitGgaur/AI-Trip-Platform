const admin = require('firebase-admin');
const path = require('path');
const { getFirestore } = require('firebase-admin/firestore');

let db = null;

try {
  const serviceAccount = require(
    path.join(__dirname, '../../firebase-service-account.json')
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const firestore_database_id =
    process.env.FIRESTORE_DATABASE_ID || 'yatrify-db';
  db = getFirestore(admin.app(), firestore_database_id);

  console.log('✅ Firebase connected successfully 🚀');
  console.log(`   Firestore database: ${firestore_database_id}`);
} catch (error) {
  console.error('❌ Firebase connection error:', error.message);
}

module.exports = { admin, db };