/**
 * Shared helpers for the /api/auth/* route handlers.
 *
 * Lives outside the `app/` route tree so multiple route files can import
 * it without Next.js worrying about non-handler exports leaking into a
 * route module.
 */

import 'server-only';
import { NextResponse } from 'next/server';
import {
  ABSOLUTE_TIMEOUT_SECONDS,
  COOKIES,
  cookieOptions,
} from './cookies';
import { ApiError, type AuthTokens } from '../api';

export function setSessionCookies(res: NextResponse, tokens: AuthTokens, opts: { resetStart?: boolean } = {}) {
  res.cookies.set(
    COOKIES.idToken,
    tokens.id_token,
    cookieOptions({ httpOnly: true, maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
  );
  res.cookies.set(
    COOKIES.refreshToken,
    tokens.refresh_token,
    cookieOptions({ httpOnly: true, maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
  );
  if (opts.resetStart) {
    res.cookies.set(
      COOKIES.sessionStartedAt,
      String(Date.now()),
      cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
    );
  }
}

export function clearSessionCookies(res: NextResponse) {
  // `Max-Age=0` deletes the cookie. We rewrite each one with the same
  // attributes so the browser actually removes the prior value.
  for (const name of Object.values(COOKIES)) {
    res.cookies.set(name, '', cookieOptions({ httpOnly: name === COOKIES.idToken || name === COOKIES.refreshToken, maxAge: 0 }));
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { message: err.message, errors: err.errors },
      { status: err.status },
    );
  }
  return NextResponse.json({ message: 'Unexpected error.' }, { status: 500 });
}
