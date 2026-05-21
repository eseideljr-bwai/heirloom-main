/**
 * Server-side auth helpers (Epic 1: Firebase-backed).
 *
 * `getCurrentUser` is the single entry point used by server components
 * and the /api/auth/me route. It:
 *
 *   1. Verifies the Firebase session cookie via the Admin SDK. No
 *      network round-trip — Admin SDK validates signatures locally.
 *   2. Calls Laravel /me with the (short-lived) ID-token cookie as
 *      Bearer to fetch the profile + family-space metadata.
 *
 * Both steps share a single `cache()` so multiple server components
 * inside the same request hit them only once.
 */

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { type AuthUser, parseFamilySpaces, type FamilySpaceRef } from '../auth';
import { serverApiFetch } from './api';
import { COOKIES } from './cookies';
import { adminAuth } from './firebase-admin';

/**
 * Verify the Firebase session cookie. Returns the decoded claims
 * (uid, email, ...) or null if missing/invalid. Wrapped in cache()
 * so /api/proxy and getCurrentUser share the same verify pass.
 */
export const verifySession = cache(async (): Promise<{
  uid: string;
  email: string | null;
} | null> => {
  const cookie = cookies().get(COOKIES.session)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    return { uid: decoded.uid, email: decoded.email ?? null };
  } catch {
    return null;
  }
});

/**
 * Fetch the current Laravel profile. Returns null for unauthenticated
 * users, expired sessions, or backend 401/403. Wrapped in cache().
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const session = await verifySession();
  if (!session) return null;
  try {
    const res = await serverApiFetch<{ data: AuthUser }>('/me');
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    throw err;
  }
});

/**
 * Active family space ulid for the current request. Falls back to the
 * first space on the user record when the cookie is unset or stale.
 */
export const getActiveSpaceId = cache(async (): Promise<string | null> => {
  const stored = cookies().get(COOKIES.activeFamilySpace)?.value || null;
  const user = await getCurrentUser();
  const spaces = parseFamilySpaces(user?.family_spaces);
  if (stored && spaces.some(s => s.ulid === stored)) return stored;
  return spaces[0]?.ulid ?? null;
});

export const getActiveSpace = cache(async (): Promise<FamilySpaceRef | null> => {
  const user = await getCurrentUser();
  const spaces = parseFamilySpaces(user?.family_spaces);
  const id = await getActiveSpaceId();
  return spaces.find(s => s.ulid === id) ?? null;
});

export const getFamilySpaces = cache(async (): Promise<FamilySpaceRef[]> => {
  const user = await getCurrentUser();
  return parseFamilySpaces(user?.family_spaces);
});

/**
 * Convenience: throws when no user is logged in. Use this inside the
 * protected (app) route group when you want a hard failure rather
 * than rendering an empty state — middleware already redirected
 * unauthenticated visitors before we got here.
 */
export async function requireUser(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error('Not authenticated');
  return u;
}
