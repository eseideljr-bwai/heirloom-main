/**
 * POST /api/auth/mobile-session — iOS WebView session bootstrap
 * (SOW D3, W-Auth).
 *
 * The native app holds a Firebase ID token, not the web's cookies. Before
 * it opens Talk or Biographer it POSTs that token here and copies the
 * returned Set-Cookie values into WKHTTPCookieStore, so the WebView's
 * first navigation is already signed in.
 *
 * /api/auth/session can't serve this: `createSessionCookie` only accepts
 * an ID token whose sign-in is under 5 minutes old, and a native user may
 * have signed in days ago. So the token is verified (revocation included)
 * and exchanged for a fresh one for the same uid. To keep that exchange
 * from turning a leaked token into a long session, the session cookie
 * lasts as long as an ID token does, and the native app re-bootstraps
 * each time it presents the WebView.
 *
 * Requires `X-Kinloom-Client: ios`. A cross-site form can't send a custom
 * header, so another origin can't drive this endpoint. The minted token is
 * returned in a cookie, so tokens from a custom sign-in are refused here and
 * by /api/auth/session establish.
 *
 * Responses: 200 + cookies; 401 bad, expired, revoked or custom token;
 * 403 missing header; 422 no idToken; 502 Firebase exchange failed.
 *
 * Body: { idToken: string, activeFamilySpaceId?: string }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { adminAuth } from '../../../../lib/server/firebase-admin';
import { mintIdTokenForUid } from '../../../../lib/server/api';
import {
  COOKIES,
  cookieOptions,
  ID_TOKEN_COOKIE_MAX_AGE_SECONDS,
  ABSOLUTE_TIMEOUT_SECONDS,
} from '../../../../lib/server/cookies';
import { EMBED_CLIENT_HEADER, EMBED_IOS } from '../../../../lib/embed';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MOBILE_SESSION_MAX_AGE_SECONDS = 60 * 60;

const SPACE_ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

type Body = {
  idToken?: unknown;
  activeFamilySpaceId?: unknown;
};

export async function POST(req: NextRequest) {
  if (req.headers.get(EMBED_CLIENT_HEADER) !== EMBED_IOS) {
    return NextResponse.json(
      { message: 'This endpoint is for the Kinloom iOS app.' },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken : null;
  if (!idToken) {
    return NextResponse.json({ message: 'idToken is required.' }, { status: 422 });
  }
  const activeFamilySpaceId =
    typeof body.activeFamilySpaceId === 'string' && SPACE_ID_PATTERN.test(body.activeFamilySpaceId)
      ? body.activeFamilySpaceId
      : null;

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    // The token this route returns is custom-minted; accepting one back would let a
    // leaked token renew itself indefinitely.
    if (decoded.firebase.sign_in_provider === 'custom') throw new Error('Server-minted tokens are not accepted.');
    uid = decoded.uid;
  } catch (err) {
    return NextResponse.json(
      { message: 'Invalid or expired Firebase token.', detail: (err as Error).message },
      { status: 401 },
    );
  }

  let freshIdToken: string | null;
  let sessionCookie: string;
  try {
    freshIdToken = await mintIdTokenForUid(uid);
    if (!freshIdToken) throw new Error('Token exchange returned no ID token.');
    sessionCookie = await adminAuth().createSessionCookie(freshIdToken, {
      expiresIn: MOBILE_SESSION_MAX_AGE_SECONDS * 1000,
    });
  } catch (err) {
    console.error('[auth/mobile-session] could not establish session:', err);
    return NextResponse.json(
      { message: 'Could not establish a web session. Try again.' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    uid,
    expiresInSeconds: MOBILE_SESSION_MAX_AGE_SECONDS,
  });
  res.cookies.set(
    COOKIES.session,
    sessionCookie,
    cookieOptions({ httpOnly: true, maxAge: MOBILE_SESSION_MAX_AGE_SECONDS }),
  );
  res.cookies.set(
    COOKIES.sessionStartedAt,
    String(Date.now()),
    cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
  );
  res.cookies.set(
    COOKIES.idToken,
    freshIdToken,
    cookieOptions({ httpOnly: true, maxAge: ID_TOKEN_COOKIE_MAX_AGE_SECONDS }),
  );
  if (activeFamilySpaceId) {
    // Checked against /me on every server render (requireActiveSpaceId),
    // so a space the user doesn't belong to is ignored there.
    res.cookies.set(
      COOKIES.activeFamilySpace,
      activeFamilySpaceId,
      cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
    );
  }
  return res;
}
