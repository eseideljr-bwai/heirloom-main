/**
 * Cookie names shared between the BFF auth routes, the server-side API
 * fetcher, and middleware.
 *
 * The two token cookies are HttpOnly (only readable on the server). The
 * other two are readable in both contexts because the client needs them
 * for the session-expiry watchdog and the family-space switcher.
 */

export const COOKIES = {
  /** Bearer token forwarded to the Laravel API. HttpOnly. */
  idToken: 'kinloom_id_token',
  /** Refresh token used by /api/auth/refresh. HttpOnly. */
  refreshToken: 'kinloom_refresh_token',
  /**
   * Wall-clock ms when this session was first established. Non-HttpOnly
   * so the client can enforce the absolute 30d timeout.
   */
  sessionStartedAt: 'kinloom_session_started_at',
  /**
   * Currently-active family space ulid. Non-HttpOnly so the client
   * switcher can update it. Server components also read it.
   */
  activeFamilySpace: 'kinloom_active_family_space',
} as const;

// Epic 2: idle 24h, absolute 30d.
export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_SECONDS = Math.floor(ABSOLUTE_TIMEOUT_MS / 1000);

type CookieOpts = {
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
};

/**
 * Build a Set-Cookie header value. Used by route handlers via
 * `NextResponse.cookies.set` and by middleware. Centralized so the
 * Secure/SameSite policy stays consistent.
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
