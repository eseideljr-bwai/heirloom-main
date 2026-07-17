/**
 * Diagnose a half-deleted account: Firebase user exists but the Laravel
 * row is gone (DELETE /me succeeded, Firebase deleteUser didn't).
 *
 * Usage: node scripts/check-orphan-user.mjs <email>
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
if (!email) {
  console.error('usage: node scripts/check-orphan-user.mjs <email>');
  process.exit(1);
}

// Minimal .env.local parser (values may be quoted, key = FIREBASE_*)
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth();

let user;
try {
  user = await auth.getUserByEmail(email);
} catch (err) {
  console.log(`Firebase: no user for ${email} (${err.errorInfo?.code ?? err.message})`);
  process.exit(0);
}
console.log(`Firebase: uid=${user.uid} emailVerified=${user.emailVerified} created=${user.metadata.creationTime}`);

// Mint an ID token for this uid and hit Laravel /me with it.
const customToken = await auth.createCustomToken(user.uid);
const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const exch = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
if (!exch.ok) {
  console.error('Identity Toolkit exchange failed:', exch.status, await exch.text());
  process.exit(1);
}
const { idToken } = await exch.json();

const apiBase = (env.KINLOOM_API_URL || 'https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api').replace(/\/$/, '');
const me = await fetch(`${apiBase}/me`, {
  headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
});
const body = await me.text();
console.log(`Laravel GET /me: ${me.status}`);
console.log(body.slice(0, 500));
