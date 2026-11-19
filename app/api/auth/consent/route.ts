/**
 * POST /api/auth/consent: remember, for this session, that the signed-in
 * person has accepted the current Terms and Privacy Policy.
 *
 * Called right after accepting (sign-up, and the /consent screen). It asks
 * the API rather than trusting the caller, and sets the `kinloom_consent`
 * cookie only on a clear "yes", so the (app) layout can stop reading
 * /me/settings on every page.
 */

import { NextResponse } from 'next/server';
import { verifySession } from '../../../../lib/server/auth';
import { consentCookie, getConsentGiven } from '../../../../lib/server/consent';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const given = await getConsentGiven();
  const res = NextResponse.json({ consent_given: given });
  if (given === true) res.cookies.set(...consentCookie(session.uid));
  return res;
}
