/**
 * Cookie names shared between the BFF auth routes, the server-side API
 * fetcher, and middleware.
 *
 * Post-Epic-1 (Firebase) cookie model:
 *
 *   kinloom_session    — Firebase session cookie. HttpOnly. ~14d. Used
 *                        by middleware (presence check) and server
 *                        components (verifySessionCookie) to know who
 *                        the request is for.
 *
 *   kinloom_id_token   — Raw Firebase ID token. HttpOnly. ~1h, matching
 *                        the token's own lifetime. Used as the Bearer
 *                        for SSR-to-Laravel API calls. The browser
 *                        re-posts a fresh ID token to /api/auth/session
 *                        whenever Firebase rotates it (onIdTokenChanged
 *                        fires ~5min before expiry).
 *
 *   kinloom_session_started_at — Wall-clock ms when this session was
 *                        first established. Non-HttpOnly so the client
 *                        can enforce the Epic-2 absolute 30d timeout.
 *
 *   kinloom_active_family_space — Currently-active family space ulid.
 *                        Non-HttpOnly so the client switcher can update
 *                        it. Server components also read it.
 *
 *   kinloom_consent    — The Firebase uid of a person whose consent to the
 *                        current Terms and Privacy Policy was confirmed this
 *                        session (at sign-in, or when they accepted). HttpOnly.
 *                        While it matches the session's uid, the (app) layout
 *                        skips GET /me/settings. Cleared on logout with the
 *                        rest. A version change mid-session is caught at the
 *                        next sign-in.
 */

export const COOKIES = {
  /** Firebase session cookie (Admin SDK-issued). HttpOnly. */
  session: 'kinloom_session',
  /** Raw Firebase ID token for SSR-to-Laravel Bearer attachment. HttpOnly. */
  idToken: 'kinloom_id_token',
  /** Wall-clock ms when this session was first established. */
  sessionStartedAt: 'kinloom_session_started_at',
  /** Currently-active family space ulid. */
  activeFamilySpace: 'kinloom_active_family_space',
  /** Uid whose consent was confirmed this session. HttpOnly. */
  consent: 'kinloom_consent',
} as const;

/**
 * The invitation token from `/invite/<token>`, so the token can be stripped
 * from the address bar (it must never reach analytics or a Referer) while a
 * refresh of the bare `/invite` still works. HttpOnly, scoped to /invite,
 * 72h like the invitation itself. Set by middleware.ts, read by
 * app/invite/page.tsx, cleared on sign-out. Not in COOKIES because of its
 * path: clearing it needs `path: INVITE_TOKEN_COOKIE_PATH`.
 */
export const INVITE_TOKEN_COOKIE = 'kinloom_invite_token';
export const INVITE_TOKEN_COOKIE_PATH = '/invite';
export const INVITE_TOKEN_COOKIE_MAX_AGE_SECONDS = 72 * 60 * 60;

// Epic 2: idle 24h, absolute 30d.
export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_SECONDS = Math.floor(ABSOLUTE_TIMEOUT_MS / 1000);

/**
 * Firebase session cookies max out at 14 days (Firebase Admin SDK
 * hard limit). We pick 14d so the session lasts as long as possible
 * without re-authentication; the Epic-2 30d absolute timeout is
 * enforced separately by `kinloom_session_started_at`.
 */
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
export const SESSION_COOKIE_MAX_AGE_SECONDS = Math.floor(
  SESSION_COOKIE_MAX_AGE_MS / 1000,
);

/**
 * Firebase ID tokens have a 1h TTL. We give the cookie a slightly
 * shorter `Max-Age` so the browser drops a stale token before Laravel
 * has a chance to 401 on it.
 */
export const ID_TOKEN_COOKIE_MAX_AGE_SECONDS = 55 * 60;

type CookieOpts = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
};

/**
 * Build a Set-Cookie attribute bag. Centralized so Secure/SameSite stay
 * consistent across every call site.
 */
export function cookieOptions(extra: CookieOpts = {}) {
  return {
    httpOnly: extra.httpOnly ?? false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: extra.path ?? '/',
    maxAge: extra.maxAge,
  };
}
