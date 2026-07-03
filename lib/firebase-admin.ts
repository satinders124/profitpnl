import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

/**
 * Normalizes a Firebase Admin private key pasted into an env var.
 * Handles the common ways this gets mangled on Windows / by editors:
 * - Wrapped in extra quotes (single or double) that weren't stripped
 * - Literal "\n" text instead of real newlines
 * - Stray "\r" (carriage return) characters from CRLF line endings
 * - Leading/trailing whitespace
 */
function normalizePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip one layer of surrounding quotes if the whole value got wrapped.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key
    .replace(/\\r\\n/g, "\\n") // literal "\r\n" -> literal "\n"
    .replace(/\\n/g, "\n") // literal "\n" -> real newline
    .replace(/\r\n/g, "\n") // real CRLF -> real LF
    .replace(/\r/g, "") // stray carriage returns
    .trim();
}

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? normalizePrivateKey(privateKeyRaw) : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY (and optionally FIREBASE_ADMIN_PROJECT_ID) in your environment."
    );
  }

  if (
    !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
    !privateKey.includes("-----END PRIVATE KEY-----")
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY does not look like a valid PEM key (missing BEGIN/END markers). Re-copy the 'private_key' field from your Firebase service account JSON."
    );
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  return cachedApp;
}

// Lazily initialized so importing this module never fails at build time —
// credentials are only required once a request actually needs Admin access.
export function getAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}

export function getAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}

