/**
 * GET /api/auth/me — current user via the HttpOnly id_token cookie.
 *
 * Used by the client `AuthProvider.refresh()` to revalidate the cached
 * user after mutations (profile update, etc). Server components should
 * call `getCurrentUser()` from `lib/server/auth.ts` instead.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
