/**
 * Firebase Admin SDK initialization (server only).
 *
 * Used by:
 *   • app/api/auth/session/route.ts — mint + verify session cookies
 *   • lib/server/auth.ts            — verify session cookies during SSR
 *   • lib/server/api.ts             — custom-token exchange when the
 *                                     short-lived ID-token cookie is stale
 *
 * Credentials come from a service-account JSON. We accept it as
 * either three separate env vars (FIREBASE_PROJECT_ID,
 * FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) or a single base64-
 * encoded JSON blob (FIREBASE_SERVICE_ACCOUNT_B64) for hosting
 * platforms that don't like multi-line env values.
 */

import 'server-only';
import {
  initializeApp,
  cert,
  getApps,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function loadServiceAccount(): ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64, 'base64').toString('utf8');
      const json = JSON.parse(decoded);
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    } catch (err) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_B64 is set but could not be parsed: ${(err as Error).message}`,
      );
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel et al store newlines as literal `\n` inside the env var; flip
  // those back to real newlines so the PEM parses.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_B64). See README.',
    );
  }

  return { projectId, clientEmail, privateKey };
}

let cachedApp: App | null = null;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  cachedApp = initializeApp({ credential: cert(loadServiceAccount()) });
  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

/**
 * Resolved project id. Convenient for routes that need it without
 * dragging in the rest of the Admin SDK.
 */
export function adminProjectId(): string {
  return loadServiceAccount().projectId as string;
}
