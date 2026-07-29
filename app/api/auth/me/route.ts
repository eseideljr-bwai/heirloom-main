/**
 * GET /api/auth/me — current user via the Firebase session cookie.
 *
 * After Epic 1 the client `AuthProvider.refresh()` calls Laravel
 * `/me` directly via the BFF proxy. This endpoint is left in place
 * as a diagnostic ("am I signed in, server-side?") and for any
 * legacy callers; it returns the same Laravel profile but via the
 * route handler so 401 status comes through cleanly.
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
