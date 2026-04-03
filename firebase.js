import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const keys = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
];

function loadFirebaseConfig() {
  const env = process.env;
  const missing = keys.filter((k) => !env[k]?.trim());
  if (missing.length) {
    throw new Error(
      `Missing or empty env: ${missing.join(", ")}. Copy .env.example to .env and add values from the Firebase console.`
    );
  }
  return {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID,
  };
}

const firebaseConfig = loadFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;