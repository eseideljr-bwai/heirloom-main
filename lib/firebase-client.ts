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

// Webpack/Next only inlines `process.env.NEXT_PUBLIC_*` when accessed via
// direct dot-notation with a literal key. Bracket access (`process.env[name]`)
// or a helper that takes a string would be left in the bundle un-substituted,
// leaving the browser with `undefined` even when the dev server has the value.
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PUBLIC_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function requirePublic(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Set Firebase web-config values in .env.local — see README.`,
    );
  }
  return value;
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
    apiKey: requirePublic('NEXT_PUBLIC_FIREBASE_API_KEY', PUBLIC_API_KEY),
    authDomain: requirePublic('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', PUBLIC_AUTH_DOMAIN),
    projectId: requirePublic('NEXT_PUBLIC_FIREBASE_PROJECT_ID', PUBLIC_PROJECT_ID),
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
  return requirePublic('NEXT_PUBLIC_FIREBASE_API_KEY', PUBLIC_API_KEY);
}
