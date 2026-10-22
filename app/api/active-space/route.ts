/**
 * POST /api/active-space  { id: string }
 *
 * Writes the `kinloom_active_family_space` cookie so server components
 * see the new selection on the next render. Client switcher pairs this
 * call with `router.refresh()` to re-execute server components.
 *
 * The cookie names a Family Space (never the Home: there is only one
 * Home per person). It is advisory, and every server render checks it
 * against `/me` again.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIES, cookieOptions, ABSOLUTE_TIMEOUT_SECONDS } from '../../../lib/server/cookies';
import { getUserState } from '../../../lib/server/auth';

export async function POST(req: NextRequest) {
  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ message: 'id is required.' }, { status: 422 });
  }

  // Make sure the person's Home is actually active in that Space — don't
  // let a client write arbitrary cookie values.
  const state = await getUserState();
  if (state.status !== 'ready') {
    return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
  }
  if (!state.spaces.some(s => s.id === body.id)) {
    return NextResponse.json({ message: 'Your Home is not in that Family Space.' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, id: body.id });
  res.cookies.set(
    COOKIES.activeFamilySpace,
    body.id,
    cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
  );
  return res;
}
