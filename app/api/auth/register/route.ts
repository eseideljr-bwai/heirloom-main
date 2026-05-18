/**
 * POST /api/auth/register — proxy to Laravel /auth/register and set
 * session cookies. Mirror of /api/auth/login.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { serverApiFetch } from '../../../../lib/server/api';
import { setSessionCookies, errorResponse } from '../../../../lib/server/auth-routes';
import type { AuthTokens, AuthUser } from '../../../../lib/auth';

type RegisterBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  password_confirmation?: unknown;
};

type RegisterResponse = AuthTokens & { user: AuthUser };

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }

  const required: (keyof RegisterBody)[] = ['name', 'email', 'password', 'password_confirmation'];
  for (const k of required) {
    if (typeof body[k] !== 'string') {
      return NextResponse.json({ message: `Field "${k}" is required.` }, { status: 422 });
    }
  }

  try {
    const data = await serverApiFetch<RegisterResponse>('/auth/register', {
      method: 'POST',
      body,
      anonymous: true,
    });
    const res = NextResponse.json({ user: data.user });
    setSessionCookies(res, data, { resetStart: true });
    return res;
  } catch (err) {
    return errorResponse(err);
  }
}
