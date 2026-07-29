/**
 * POST   /api/auth/session  — sync browser auth state with server cookies
 * DELETE /api/auth/session  — clear server cookies (logout)
 *
 * The browser sends a Firebase ID token (obtained via the Web SDK) and
 * the server:
 *
 *   1. Verifies it via the Admin SDK (defence-in-depth; same check
 *      Laravel will do on every API call).
 *   2. Mints a long-lived Firebase session cookie (~14d).
 *   3. Stores the raw ID token in a second short-lived cookie (~55min)
 *      so SSR can use it as a Bearer for Laravel requests.
 *
 * The browser POSTs again whenever Firebase rotates the ID token
 * (onIdTokenChanged fires automatically ~5min before expiry) so the
 * second cookie stays fresh. Pass `mode: "refresh"` for those
 * follow-up posts — it skips resetting `session_started_at` so the
 * absolute 30d clock isn't extended on every token rotation.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '../../../../lib/server/firebase-admin';
import {
  COOKIES,
  cookieOptions,
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  ID_TOKEN_COOKIE_MAX_AGE_SECONDS,
  ABSOLUTE_TIMEOUT_SECONDS,
} from '../../../../lib/server/cookies';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  idToken?: unknown;
  /**
   * "establish" — first login/register; mints a fresh session cookie
   *               and resets the absolute-timeout clock.
   * "refresh"   — Firebase rotated the ID token; keep the existing
   *               session cookie, just update the id_token cookie.
   */
  mode?: unknown;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json(
      { message: 'idToken is required.' },
      { status: 422 },
    );
  }
  const mode = body.mode === 'refresh' ? 'refresh' : 'establish';

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch (err) {
    return NextResponse.json(
      { message: 'Invalid or expired Firebase token.', detail: (err as Error).message },
      { status: 401 },
    );
  }

  // Firebase requires the ID token to be "recent" (auth_time within 5
  // minutes) to mint a session cookie. For refresh mode we skip the
  // session-cookie work entirely and just rotate the id_token cookie.
  const res = NextResponse.json({
    ok: true,
    uid: decoded.uid,
    email: decoded.email ?? null,
  });

  if (mode === 'establish') {
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth().createSessionCookie(idToken, {
        expiresIn: SESSION_COOKIE_MAX_AGE_MS,
      });
    } catch (err) {
      return NextResponse.json(
        {
          message:
            'Could not establish session. Sign in again — the token may be older than 5 minutes.',
          detail: (err as Error).message,
        },
        { status: 401 },
      );
    }
    res.cookies.set(
      COOKIES.session,
      sessionCookie,
      cookieOptions({
        httpOnly: true,
        maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      }),
    );
    res.cookies.set(
      COOKIES.sessionStartedAt,
      String(Date.now()),
      cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
    );
  }

  res.cookies.set(
    COOKIES.idToken,
    idToken,
    cookieOptions({
      httpOnly: true,
      maxAge: ID_TOKEN_COOKIE_MAX_AGE_SECONDS,
    }),
  );

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });

  // Best-effort: revoke refresh tokens so a stolen ID token can't be
  // refreshed elsewhere. If the session cookie is missing or invalid
  // we still proceed to clear everything client-side.
  try {
    const sessionCookie = cookies().get(COOKIES.session)?.value;
    if (sessionCookie) {
      const decoded = await adminAuth().verifySessionCookie(sessionCookie);
      await adminAuth().revokeRefreshTokens(decoded.uid);
    }
  } catch {
    // ignore
  }

  for (const name of Object.values(COOKIES)) {
    res.cookies.set(
      name,
      '',
      cookieOptions({
        httpOnly: name === COOKIES.session || name === COOKIES.idToken,
        maxAge: 0,
      }),
    );
  }
  return res;
}
