/**
 * POST /api/auth/logout — clear session cookies. We intentionally don't
 * call the Laravel API; tokens stay technically valid until expiry but
 * the browser can't use them anymore.
 */

import { NextResponse } from 'next/server';
import { clearSessionCookies } from '../../../../lib/server/auth-routes';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
}
