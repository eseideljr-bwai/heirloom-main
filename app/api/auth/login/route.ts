/**
 * POST /api/auth/login
 *
 * Proxies to Laravel's /auth/login, then writes HttpOnly cookies for
 * the id_token + refresh_token, and a non-HttpOnly session_started_at
 * stamp for the client-side idle/absolute watchdog.
 *
 * Browser sees the user payload in the JSON body; the tokens never
 * touch JS.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { serverApiFetch } from '../../../../lib/server/api';
import { setSessionCookies, errorResponse } from '../../../../lib/server/auth-routes';
import type { AuthTokens, AuthUser } from '../../../../lib/auth';

type LoginPayload = { email?: unknown; password?: unknown };
type LoginResponse = AuthTokens & { user: AuthUser };

export async function POST(req: NextRequest) {
  let body: LoginPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }
  const { email, password } = body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ message: 'Email and password are required.' }, { status: 422 });
  }

  try {
    const data = await serverApiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    });
    const res = NextResponse.json({ user: data.user });
    setSessionCookies(res, data, { resetStart: true });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
