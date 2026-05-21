/**
 * Firebase Web SDK initialization (browser only).
 *
 * Epic 1: the front end authenticates against Firebase. The resulting
 * ID token is sent to Laravel as a Bearer credential on every API call.
 *
 * Only safe-to-publish values live here:
 *   • apiKey         — a public identifier, not a secret
 *   • authDomain     — also public
 *   • projectId      — also public
 *
 * These come from `NEXT_PUBLIC_FIREBASE_*` env vars at build time. If
 * any are missing we throw at first SDK access so misconfiguration is
 * loud rather than silent.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

function readPublicEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Set Firebase web-config values in .env.local — see README.`,
    );
  }
  return v;
}

let cachedApp: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  cachedApp = initializeApp({
    apiKey: readPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: readPublicEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: readPublicEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  });
  return cachedApp;
}

/** Browser-only Auth instance. Lazy so SSR builds don't crash. */
export function firebaseAuth(): Auth {
  return getAuth(getApp());
}

/**
 * Public web API key — required for the Identity Toolkit REST call that
 * the BFF uses to exchange a custom token for an ID token during SSR.
 * (Server reads the *same* NEXT_PUBLIC_* value; it's not secret.)
 */
export function firebaseWebApiKey(): string {
  return readPublicEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
}
