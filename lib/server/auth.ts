/**
 * Server-side auth helpers (Epic 1: Firebase-backed).
 *
 * `getUserState` is the single entry point. Everything else here derives
 * from it, so one request performs at most one /me round-trip. It:
 *
 *   1. Verifies the Firebase session cookie via the Admin SDK. No
 *      network round-trip — Admin SDK validates signatures locally.
 *   2. Calls the API's /me with the (short-lived) ID-token cookie as
 *      Bearer: the account, its one Family Home, and its Family Spaces.
 *      The API provisions an account on a person's first request, so
 *      every signed-in person has a /me (Phase 3 contract §2.1).
 *   3. Classifies the result into exactly one state, throwing on
 *      anything ambiguous.
 *
 * Step 3 is load-bearing: a bare `null` used to mean every protected page
 * redirected to onboarding whenever /me hiccuped, however far through
 * onboarding the user actually was.
 */

import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '../api';
import { type AuthUser, type FamilySpaceRef, type SpaceSummary, homeAsLegacyRef } from '../auth';
import { serverKinloomApi } from './kinloom-api';
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
 * The states are mutually exclusive, and anything we can't classify throws
 * rather than defaulting to the onboarding branch (a transient /me failure
 * must never look like a brand-new account).
 *
 * Readiness follows the contract (§3.1): gate on `onboarding_state`, never
 * on `spaces`. A person with no Family Space is the normal case.
 */
export type UserState =
  | { status: 'unauthenticated' }
  /** `profile_pending`: send to the onboarding profile step. */
  | { status: 'onboarding'; user: AuthUser }
  /** Memorialized (CO-1 C2): /me answers, every other route is 403. */
  | { status: 'memorialized'; user: AuthUser }
  | { status: 'ready'; user: AuthUser; home: AuthUser['home']; spaces: SpaceSummary[] };

export const getUserState = cache(async (): Promise<UserState> => {
  const session = await verifySession();
  if (!session) return { status: 'unauthenticated' };

  // A 401/403 here is not "not onboarded yet" any more: the API provisions
  // on first request. It means the token was rejected (wrong Firebase
  // project, revoked), which is a fault to surface, not a state to route on.
  const user: AuthUser = await serverKinloomApi.get('/me');

  if (user.memorialized_at) return { status: 'memorialized', user };
  if (user.onboarding_state === 'profile_pending') return { status: 'onboarding', user };
  return { status: 'ready', user, home: user.home, spaces: user.spaces };
});

/**
 * The person's Family Home, or a redirect to wherever they need to go.
 * Use this in server components rendering a protected page: it can't
 * confuse an auth failure for onboarding.
 */
export async function requireHome(): Promise<{ homeId: string; home: AuthUser['home']; user: AuthUser }> {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  if (state.status === 'onboarding') redirect('/onboarding/profile');
  if (state.status === 'memorialized') redirect('/home');
  return { homeId: state.home.id, home: state.home, user: state.user };
}

/**
 * The Family Space this person is looking at (the `/spaces/*` area), or
 * null when their Home is in none. Comes from the active-space cookie,
 * checked against /me on every call, so a Space the Home has left is
 * ignored; falls back to the first Space.
 */
export async function getActiveFamilySpaceId(): Promise<string | null> {
  const state = await getUserState();
  if (state.status !== 'ready') return null;
  return resolveFamilySpaceId(state.spaces);
}

function resolveFamilySpaceId(spaces: SpaceSummary[]): string | null {
  if (spaces.length === 0) return null;
  const stored = cookies().get(COOKIES.activeFamilySpace)?.value || null;
  if (stored && spaces.some(s => s.id === stored)) return stored;
  return spaces[0].id;
}

/**
 * Fetch the current profile, or null when there's no usable session.
 * Derived from `getUserState` so both share one /me round-trip.
 *
 * Callers can't tell "signed out" from "not onboarded yet" through this
 * signature — if that distinction matters (i.e. you're about to redirect),
 * use `getUserState` or `requireHome`.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const state = await getUserState();
  return state.status === 'unauthenticated' ? null : state.user;
}

// ─── Agent routes ───────────────────────────────────────────────────
//
// The Talk and Biographer routes still call this by its pre-Phase-3 name. The
// container they mean is the person's Family Home, so it returns the Home id.

export type ActiveSpaceResult =
  | {
      ok: true;
      /** The Home id (see the note above). */
      spaceId: string;
      /** The Home as the legacy container ref; `member_id` is the person id. */
      space: FamilySpaceRef | null;
      allSpaces: FamilySpaceRef[];
    }
  | {
      ok: false;
      status: number;
      error: string;
      /**
       * Seconds to wait, on a 429. Passed as a number so a caller can drive a
       * live countdown; the prose in `error` is for callers that can't.
       */
      retryAfterSeconds?: number;
    };

/**
 * Resolve the container for an API route, turning an upstream failure into
 * a structured result instead of letting it escape the handler.
 *
 * Reaching /me can fail for reasons that have nothing to do with the
 * caller's session — a throttle, an outage. Called bare as a route's first
 * statement, any of those escaped the handler and Next emitted a naked 500:
 * no JSON body, nothing in the network tab to act on, and on the batch
 * publish it destroyed the per-item result envelope the client needs to
 * retry only what failed.
 *
 * `routeLabel` is used for the log line so a failure names the route it
 * came from without having to read a stack.
 *
 * @deprecated `spaceId` is the Home id. Prefer `requireHome()`.
 */
export async function resolveActiveSpaceForRoute(
  routeLabel: string,
): Promise<ActiveSpaceResult> {
  try {
    const state = await getUserState();
    if (state.status !== 'ready') return { ok: false, status: 401, error: 'Not authenticated.' };
    const ref = homeAsLegacyRef(state.user);
    return { ok: true, spaceId: ref.ulid, space: ref, allSpaces: [ref] };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      const wait = err.retryAfterSeconds;
      console.error(
        `[${routeLabel}] rate limited resolving the Home; retry_after=${wait ?? 'n/a'}`,
      );
      return {
        ok: false,
        status: 429,
        error: wait
          ? `Too many requests right now. Please wait about ${wait} seconds and try again.`
          : 'Too many requests right now. Please wait a moment and try again.',
        retryAfterSeconds: wait,
      };
    }
    console.error(`[${routeLabel}] could not resolve the Home:`, err);
    return {
      ok: false,
      status: 502,
      error: 'Could not reach your family home. Please try again in a moment.',
    };
  }
}

/**
 * Provider-hydration values for the root layout. `getUserState` throws on
 * unclassifiable failures, which is what we want on a page (the (app) error
 * boundary catches it) but not in the root layout, where the only boundary
 * above is global-error — a full-page crash for what may be a blip.
 *
 * Degrading to nulls is safe: the page rendered inside still runs its own
 * guard and will redirect or throw as appropriate.
 */
export async function getInitialAuthState(): Promise<{
  user: AuthUser | null;
  activeFamilySpaceId: string | null;
}> {
  try {
    const state = await getUserState();
    if (state.status === 'unauthenticated') return { user: null, activeFamilySpaceId: null };
    return {
      user: state.user,
      activeFamilySpaceId: state.status === 'ready' ? resolveFamilySpaceId(state.spaces) : null,
    };
  } catch (err) {
    console.error('[auth] Could not resolve initial auth state for hydration:', err);
    return { user: null, activeFamilySpaceId: null };
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
