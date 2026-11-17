/**
 * Firebase Admin SDK initialization (server only).
 *
 * Used by:
 *   • app/api/auth/session/route.ts — mint + verify session cookies
 *   • lib/server/auth.ts            — verify session cookies during SSR
 *   • lib/server/api.ts             — custom-token exchange when the
 *                                     short-lived ID-token cookie is stale
 *
 * Credentials come from one of:
 *   • a single base64-encoded service-account JSON
 *     (FIREBASE_SERVICE_ACCOUNT_B64), for hosting platforms that don't
 *     like multi-line env values;
 *   • three separate env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 *     FIREBASE_PRIVATE_KEY);
 *   • the runtime's own service account (Application Default Credentials)
 *     when only FIREBASE_PROJECT_ID is set. Production uses this: the
 *     bw-heirloom-prod organization blocks service-account key creation.
 *     That account needs Firebase Authentication Admin, and Service Account
 *     Token Creator on itself so `createCustomToken` can sign through IAM.
 */

import 'server-only';
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
  type App,
  type AppOptions,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

function serviceAccountFromEnv(): ServiceAccount | null {
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
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

function appOptions(): AppOptions {
  const serviceAccount = serviceAccountFromEnv();
  if (serviceAccount) return { credential: cert(serviceAccount) };

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_B64, or FIREBASE_PROJECT_ID ' +
        '(with FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or alone to use the runtime service account). See .env.example.',
    );
  }
  return { credential: applicationDefault(), projectId };
}

let cachedApp: App | null = null;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  const existing = getApps()[0];
  if (existing) {
    cachedApp = existing;
    return existing;
  }
  cachedApp = initializeApp(appOptions());
  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
