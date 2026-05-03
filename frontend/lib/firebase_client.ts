import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

let cached_app: FirebaseApp | null = null;

function read_web_config() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };
}

/** Must match Backend `FIRESTORE_DATABASE_ID` / named DB in Firebase Console (default: yatrify-db). */
function get_firestore_database_id(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID?.trim() || "yatrify-db";
}

export function get_firebase_app(): FirebaseApp {
  if (cached_app) return cached_app;
  const existing = getApps()[0];
  if (existing) {
    cached_app = existing;
    return existing;
  }
  const cfg = read_web_config();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error(
      "Firebase web config missing: set NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local",
    );
  }
  cached_app = initializeApp(cfg);
  return cached_app;
}

export function get_firebase_auth() {
  return getAuth(get_firebase_app());
}

export function get_firebase_db() {
  return getFirestore(get_firebase_app(), get_firestore_database_id());
}

export function get_firebase_storage() {
  return getStorage(get_firebase_app());
}
