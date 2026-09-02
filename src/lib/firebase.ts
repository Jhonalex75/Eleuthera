import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBRYu4WbP9vsSyrZap6tDtkWAijxDZ7CFE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "studio-6587601373-5651d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "studio-6587601373-5651d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "studio-6587601373-5651d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1071226842307",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1071226842307:web:dc7cd56b52d6a8273e0676",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

/** The whole solar-field dataset lives in one document: ~132 KB, well inside the
 *  1 MiB Firestore limit, so a page load costs a single read instead of 572. */
export const SITE_DOC = { collection: "sites", id: "eleuthera-solar" } as const;
