/**
 * Uploads the solar-field register to Firestore.
 *
 *   node scripts/seed-firestore.mjs
 *
 * The whole dataset goes into ONE document (sites/eleuthera-solar), about 132 KB
 * against Firestore's 1 MiB limit. A page load then costs a single read instead
 * of 572, and onSnapshot pushes the update to every open browser at once.
 *
 * Requires Firestore rules that allow the write. For a first load, set the rules
 * to allow writes temporarily, run this, then lock them back down to read-only:
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{db}/documents {
 *       match /sites/{id} {
 *         allow read: if true;
 *         allow write: if false;   // flip to true only while seeding
 *       }
 *     }
 *   }
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(here, "../src/data/eleuthera-solar.json");
const COLLECTION = "sites";
const DOC_ID = "eleuthera-solar";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBRYu4WbP9vsSyrZap6tDtkWAijxDZ7CFE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "studio-6587601373-5651d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "studio-6587601373-5651d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "studio-6587601373-5651d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1071226842307",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1071226842307:web:dc7cd56b52d6a8273e0676",
};

async function main() {
  const raw = await readFile(DATA_PATH, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.tables) || !data.tables.length) {
    throw new Error("No tables found in " + DATA_PATH);
  }
  const bytes = Buffer.byteLength(raw);
  if (bytes > 1_000_000) {
    throw new Error(
      `Payload is ${(bytes / 1024).toFixed(0)} KB, over the 1 MiB document limit. ` +
        "Split it into a tables subcollection before seeding.",
    );
  }

  data.meta.updatedAt = new Date().toISOString();

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`Uploading ${data.tables.length} tables (${(bytes / 1024).toFixed(0)} KB) ...`);
  await setDoc(doc(db, COLLECTION, DOC_ID), data);
  console.log(`Done. ${COLLECTION}/${DOC_ID} updated at ${data.meta.updatedAt}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nSeeding failed:", err.message);
  if (String(err.code).includes("permission-denied")) {
    console.error(
      "\nFirestore rejected the write. Open the Firebase console → Firestore → Rules,\n" +
        "allow writes on /sites/{id} while you seed, then set them back to read-only.",
    );
  }
  process.exit(1);
});
