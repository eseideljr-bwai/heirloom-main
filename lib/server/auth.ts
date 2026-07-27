/**
 * Server-side auth helpers (Epic 1: Firebase-backed).
 *
 * `getUserState` is the single entry point. Everything else here derives
 * from it, so one request performs at most one /me round-trip. It:
 *
 *   1. Verifies the Firebase session cookie via the Admin SDK. No
 *      network round-trip — Admin SDK validates signatures locally.
 *   2. Calls Laravel /me with the (short-lived) ID-token cookie as
 *      Bearer to fetch the profile + family-space metadata.
 *   3. Classifies the result into exactly one of unauthenticated /
 *      onboarding / ready, throwing on anything ambiguous.
 *
 * Step 3 is load-bearing: `getActiveSpaceId` returning a bare `null`
 * previously meant every protected page redirected to onboarding whenever
 * /me hiccuped, however far through onboarding the user actually was.
 */

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '../api';
import {
  type AuthUser,
  hasFamilySpacePayload,
  parseFamilySpaces,
  type FamilySpaceRef,
} from '../auth';
import { serverApiFetch } from './api';
import { COOKIES } from './cookies';
import { adminAuth } from './firebase-admin';

/**
 * Verify the Firebase session cookie. Returns the decoded claims
 * (uid, email, ...) or null if missing/invalid. Wrapped in cache()
 * so /api/proxy and getCurrentUser share the same verify pass.
 */
/**
 * Admin SDK error codes that mean "we could not complete the revocation
 * lookup", as opposed to "this cookie is not valid". The revocation check
 * is a live round-trip to Firebase, so treating its failures as a
 * signed-out user turns any Firebase blip into a bogus redirect.
 */
const REVOCATION_CHECK_UNAVAILABLE = new Set([
  'auth/internal-error',
  'auth/network-request-failed',
]);

export const verifySession = cache(async (): Promise<{
  uid: string;
  email: string | null;
  emailVerified: boolean;
} | null> => {
  const cookie = cookies().get(COOKIES.session)?.value;
  if (!cookie) return null;

  let decoded;
  try {
    decoded = await adminAuth().verifySessionCookie(cookie, true);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (!code || !REVOCATION_CHECK_UNAVAILABLE.has(code)) return null;
    // Fall back to local signature + expiry verification so an outage on
    // the revocation lookup doesn't sign everyone out.
    try {
      decoded = await adminAuth().verifySessionCookie(cookie, false);
    } catch {
      return null;
    }
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    // Baked into the session cookie at mint time. Flips true only
    // after the user verifies and the cookie is re-minted (see
    // syncEmailVerified in lib/auth.ts).
    emailVerified: decoded.email_verified === true,
  };
});

/**
 * Why this exists: a single `AuthUser | null` return can't distinguish
 * "nobody is signed in" from "the backend rejected us", and callers that
 * turned that `null` into an empty family-space list could only respond by
 * sending the user to onboarding. A transient /me failure was therefore
 * indistinguishable from a brand-new account, and dropped fully-onboarded
 * users on step 2 of the wizard.
 *
 * These three states are mutually exclusive, and anything we can't classify
 * throws rather than defaulting to the onboarding branch.
 */
export type UserState =
  | { status: 'unauthenticated' }
  | { status: 'onboarding'; user: AuthUser | null }
  | { status: 'ready'; user: AuthUser; spaces: FamilySpaceRef[] };

export const getUserState = cache(async (): Promise<UserState> => {
  const session = await verifySession();
  if (!session) return { status: 'unauthenticated' };

  let user: AuthUser;
  try {
    const res = await serverApiFetch<{ data: AuthUser }>('/me');
    user = res.data;
  } catch (err) {
    // 401/403 with a verified session cookie and a successfully attached
    // Bearer means Laravel has no row for this uid yet — a genuinely
    // un-onboarded account. serverApiFetch now throws rather than sending
    // an anonymous request, so "no Bearer available" lands below instead
    // of masquerading as this case.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      return { status: 'onboarding', user: null };
    }
    throw err;
  }

  const spaces = parseFamilySpaces(user.family_spaces);
  if (spaces.length > 0) return { status: 'ready', user, spaces };

  // /me listed spaces we couldn't parse — a payload-shape mismatch, not an
  // un-onboarded user. Onboarding can't fix it and would quietly create a
  // duplicate space, so fail loudly. An account that genuinely has no spaces
  // (new, or removed from its last one) sends an empty payload and falls
  // through to onboarding below.
  if (hasFamilySpacePayload(user.family_spaces)) {
    throw new Error(
      `User ${user.ulid} has a non-empty family_spaces payload that yielded no ` +
        `parseable space: ${JSON.stringify(user.family_spaces)}`,
    );
  }

  return { status: 'onboarding', user };
});

/**
 * Active family space ulid for a protected page, or a redirect to wherever
 * the user actually needs to go. Prefer this over `getActiveSpaceId` in
 * server components — it can't confuse an auth failure for onboarding.
 */
export async function requireActiveSpaceId(): Promise<string> {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  if (state.status === 'onboarding') redirect('/onboarding/profile');

  const stored = cookies().get(COOKIES.activeFamilySpace)?.value || null;
  if (stored && state.spaces.some(s => s.ulid === stored)) return stored;
  return state.spaces[0].ulid;
}

/**
 * Fetch the current Laravel profile, or null when there's no usable
 * session. Derived from `getUserState` so both share one /me round-trip.
 *
 * Callers can't tell "signed out" from "not onboarded yet" through this
 * signature — if that distinction matters (i.e. you're about to redirect),
 * use `getUserState` or `requireActiveSpaceId`.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const state = await getUserState();
  return state.status === 'unauthenticated' ? null : state.user;
}

/**
 * Active family space ulid, or null. Kept for callers that must not
 * redirect (the root layout, route handlers). Server components rendering
 * a protected page should use `requireActiveSpaceId` instead.
 */
export async function getActiveSpaceId(): Promise<string | null> {
  const state = await getUserState();
  if (state.status !== 'ready') return null;
  const stored = cookies().get(COOKIES.activeFamilySpace)?.value || null;
  if (stored && state.spaces.some(s => s.ulid === stored)) return stored;
  return state.spaces[0].ulid;
}

export async function getActiveSpace(): Promise<FamilySpaceRef | null> {
  const state = await getUserState();
  if (state.status !== 'ready') return null;
  const id = await getActiveSpaceId();
  return state.spaces.find(s => s.ulid === id) ?? null;
}

export async function getFamilySpaces(): Promise<FamilySpaceRef[]> {
  const state = await getUserState();
  return state.status === 'ready' ? state.spaces : [];
}

/**
 * Provider-hydration values for the root layout. `getUserState` throws on
 * unclassifiable failures, which is what we want on a page (the (app) error
 * boundary catches it) but not in the root layout, where the only boundary
 * above is global-error — a full-page crash for what may be a blip.
 *
 * Degrading to nulls is safe: the page rendered inside still runs its own
 * `requireActiveSpaceId` guard and will redirect or throw as appropriate.
 */
export async function getInitialAuthState(): Promise<{
  user: AuthUser | null;
  activeSpaceId: string | null;
}> {
  try {
    const state = await getUserState();
    if (state.status !== 'ready') {
      return { user: state.status === 'onboarding' ? state.user : null, activeSpaceId: null };
    }
    const stored = cookies().get(COOKIES.activeFamilySpace)?.value || null;
    const activeSpaceId =
      stored && state.spaces.some(s => s.ulid === stored) ? stored : state.spaces[0].ulid;
    return { user: state.user, activeSpaceId };
  } catch (err) {
    console.error('[auth] Could not resolve initial auth state for hydration:', err);
    return { user: null, activeSpaceId: null };
  }
}

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
