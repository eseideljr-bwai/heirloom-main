/**
 * POST /api/auth/refresh — proxy to Laravel /auth/refresh using the
 * HttpOnly refresh_token cookie, and rotate the id_token + refresh_token
 * cookies with the fresh values.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serverApiFetch } from '../../../../lib/server/api';
import { setSessionCookies, clearSessionCookies, errorResponse } from '../../../../lib/server/auth-routes';
import { COOKIES } from '../../../../lib/server/cookies';
import type { AuthTokens } from '../../../../lib/auth';

export async function POST() {
  const refresh_token = cookies().get(COOKIES.refreshToken)?.value;
  if (!refresh_token) {
    const res = NextResponse.json({ message: 'No refresh token.' }, { status: 401 });
    clearSessionCookies(res);
    return res;
  }

  try {
    const data = await serverApiFetch<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refresh_token },
      anonymous: true,
    });
    // Don't reset session_started_at — refresh shouldn't extend the
    // absolute 30d window.
    const res = NextResponse.json({ ok: true });
    setSessionCookies(res, data);
    return res;
  } catch (err) {
    const res = errorResponse(err);
    clearSessionCookies(res);
    return res;
  }
}
