import { cache } from 'react';
import { cookies } from 'next/headers';
import { serverApiFetch } from './api';
import { verifySession } from './auth';
import { COOKIES, cookieOptions, SESSION_COOKIE_MAX_AGE_SECONDS } from './cookies';
import { serverKinloomApi } from './kinloom-api';
import type { components } from '../api-schema/typed';

type Settings = components['schemas']['Settings'];

/**
 * Whether the signed-in person has accepted the current Terms of Use and
 * Trust & Privacy Policy (`consent.consent_given` in GET /me/settings).
 * The server turns it false when either document's version changes.
 *
 * Asked once a session: sign-in (and accepting consent) sets the
 * `kinloom_consent` cookie to the person's uid, and while it matches the
 * session this answers true without calling the API. Without it, it reads
 * /me/settings as before.
 *
 * Returns null when settings can't be read (throttle, outage). Callers let
 * the request through in that case rather than locking everyone out of the
 * app; the next page load checks again.
 */
export const getConsentGiven = cache(async (): Promise<boolean | null> => {
  const confirmedFor = cookies().get(COOKIES.consent)?.value;
  if (confirmedFor) {
    const session = await verifySession();
    if (session && session.uid === confirmedFor) return true;
  }
  try {
    const settings = await serverKinloomApi.get('/me/settings');
    return settings.consent.consent_given;
  } catch (err) {
    console.warn('[consent] could not read /me/settings', err);
    return null;
  }
});

/** Same-origin path to return to after /consent, never /consent itself. */
export function safeConsentNext(value: string | null | undefined): string {
  if (!value) return '/home';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/home';
  if (value === '/consent' || value.startsWith('/consent?') || value.startsWith('/consent/')) return '/home';
  return value;
}

/**
 * Reads consent with an explicit ID token: at sign-in the token cookie isn't
 * on the request yet. null when it can't be read.
 */
export async function readConsentWithToken(idToken: string): Promise<boolean | null> {
  try {
    const settings = await serverApiFetch<Settings>('/me/settings', {
      anonymous: true,
      headers: { Authorization: `Bearer ${idToken}` },
    });
    return settings.consent.consent_given;
  } catch (err) {
    console.warn('[consent] could not read /me/settings at sign-in', err);
    return null;
  }
}

/** Set-Cookie arguments that remember `uid`'s consent for this session. */
export function consentCookie(uid: string): [string, string, ReturnType<typeof cookieOptions>] {
  return [COOKIES.consent, uid, cookieOptions({ httpOnly: true, maxAge: SESSION_COOKIE_MAX_AGE_SECONDS })];
}
