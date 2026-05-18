/**
 * Server-side auth helpers. Use these from server components and route
 * handlers to figure out who the request is for without touching the
 * client-side AuthProvider.
 */

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { type AuthUser, parseFamilySpaces, type FamilySpaceRef } from '../auth';
import { serverApiFetch } from './api';
import { COOKIES } from './cookies';

/**
 * Fetch the current user from /me. Wrapped in `cache()` so multiple
 * server components in the same request share one round-trip.
 *
 * Returns `null` when the user is unauthenticated, the cookie is
 * invalid/expired, or the backend is unreachable — callers should
 * decide whether to redirect or render an unauth state.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  if (!cookies().get(COOKIES.idToken)?.value) return null;
  try {
    const res = await serverApiFetch<{ data: AuthUser }>('/me');
    return res.data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return null;
    }
    // Surface other backend errors so error.tsx can show them.
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
 * Convenience: throws a typed error when no user is logged in. Use this
 * in server components inside the protected (app) route group when you
 * want a hard failure rather than rendering an empty state — middleware
 * already redirected unauthenticated visitors before we got here.
 */
export async function requireUser(): Promise<AuthUser> {
  const u = await getCurrentUser();
  if (!u) throw new Error('Not authenticated');
  return u;
}
