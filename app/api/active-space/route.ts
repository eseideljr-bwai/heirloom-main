/**
 * POST /api/active-space  { ulid: string }
 *
 * Writes the `kinloom_active_family_space` cookie so server components
 * see the new selection on the next render. Client switcher pairs this
 * call with `router.refresh()` to re-execute server components.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIES, cookieOptions, ABSOLUTE_TIMEOUT_SECONDS } from '../../../lib/server/cookies';
import { getFamilySpaces } from '../../../lib/server/auth';

export async function POST(req: NextRequest) {
  let body: { ulid?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body.' }, { status: 400 });
  }
  if (typeof body.ulid !== 'string' || !body.ulid) {
    return NextResponse.json({ message: 'ulid is required.' }, { status: 422 });
  }

  // Make sure the user is actually a member of that space — don't let a
  // client write arbitrary cookie values.
  const spaces = await getFamilySpaces();
  if (!spaces.some(s => s.ulid === body.ulid)) {
    return NextResponse.json({ message: 'Not a member of that family space.' }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, ulid: body.ulid });
  res.cookies.set(
    COOKIES.activeFamilySpace,
    body.ulid,
    cookieOptions({ maxAge: ABSOLUTE_TIMEOUT_SECONDS }),
  );
  return res;
}
