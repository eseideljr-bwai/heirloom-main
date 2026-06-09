/**
 * Server-only Heirloom API fetcher (Epic 1: Firebase-backed).
 *
 * Reads the short-lived `kinloom_id_token` cookie (Firebase ID token,
 * ~1h TTL) and attaches it as a Bearer to every Laravel call.
 *
 * If the cookie is missing or the ID token has expired but the long-
 * lived session cookie is still valid (the browser hasn't re-posted a
 * fresh token yet — usually because the tab was closed past the 1h
 * window), we mint a custom token via the Admin SDK and exchange it
 * for a fresh ID token via the Identity Toolkit REST API. The result
 * is cached per request via React `cache()` so we only do this once
 * per SSR render even when multiple server components fetch in
 * parallel.
 */

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { COOKIES } from './cookies';
import { adminAuth } from './firebase-admin';
import { verifySession } from './auth';

export const SERVER_API_BASE = (
  process.env.KINLOOM_API_URL ||
  process.env.BACKEND_API_URL ||
  'https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api'
).replace(/\/$/, '');

export type ServerFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization header even if a token is available. */
  anonymous?: boolean;
  /**
   * Disable Next's data cache for this request. Defaults to `'no-store'`
   * because authenticated user data should never be cached across users.
   */
  noStore?: boolean;
};

/** Decode the JWT `exp` claim without verifying (cheap, server-side only). */
function isIdTokenLikelyExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    const json = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    );
    if (typeof json.exp !== 'number') return true;
    // Treat as expired 30s before actual expiry so we don't race the
    // backend's clock skew tolerance.
    return Date.now() / 1000 >= json.exp - 30;
  } catch {
    return true;
  }
}

/**
 * Mint a Firebase ID token server-side for the currently-signed-in
 * user. Uses Admin SDK to create a custom token, then exchanges it
 * via the Identity Toolkit REST API.
 *
 * Cached per request so multiple SSR fetches share one round-trip.
 */
const mintIdTokenForCurrentSession = cache(async (): Promise<string | null> => {
  const session = await verifySession();
  if (!session) return null;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_API_KEY is not set — needed for SSR custom-token exchange.',
    );
  }

  const customToken = await adminAuth().createCustomToken(session.uid);
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      cache: 'no-store',
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Identity Toolkit exchange failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { idToken?: string };
  return data.idToken ?? null;
});

async function readIdToken(): Promise<string | null> {
  let token: string | null;
  try {
    token = cookies().get(COOKIES.idToken)?.value ?? null;
  } catch {
    // Called outside a request scope (rare). Treat as anonymous.
    return null;
  }
  if (token && !isIdTokenLikelyExpired(token)) return token;
  // Cookie is missing or its token is past TTL. Mint a fresh one.
  return mintIdTokenForCurrentSession();
}

export async function serverApiFetch<T = unknown>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<T> {
  const { body, anonymous, noStore = true, headers, ...rest } = options;

  const h: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) || {}),
  };
  if (!anonymous) {
    const token = await readIdToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${SERVER_API_BASE}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: noStore ? 'no-store' : rest.cache,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export { ApiError };

/**
 * Exposed so the catch-all BFF proxy can attach the same Bearer it
 * would use for SSR (preferring the cookie, falling back to mint).
 */
export async function resolveBearerForProxy(): Promise<string | null> {
  return readIdToken();
}
