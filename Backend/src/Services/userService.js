const { admin, db } = require("../config/firebase");
const USERS_COLLECTION = "users";

// Naya user document banao Firestore mein
const createUser = async (userData) => {
  const { uid } = userData;

  const newUser = {
    ...userData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(USERS_COLLECTION).doc(uid).set(newUser);

  return newUser;
};

// UID se user fetch karo
const getUserById = async (uid) => {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

  if (!doc.exists) return null;

  return { id: doc.id, ...doc.data() };
};

// User ki fields update karo + lastLoginAt refresh karo
const updateUser = async (uid, updates) => {
  const updatesWithTimestamp = {
    ...updates,
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(USERS_COLLECTION).doc(uid).update(updatesWithTimestamp);

  // Updated doc wapas fetch karke return karo
  const updated = await getUserById(uid);
  return updated;
};

module.exports = { createUser, getUserById, updateUser };