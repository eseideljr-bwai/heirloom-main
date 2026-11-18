import { cache } from 'react';
import { serverKinloomApi } from './kinloom-api';

/**
 * Whether the signed-in person has accepted the current Terms of Use and
 * Trust & Privacy Policy (`consent.consent_given` in GET /me/settings).
 * The server turns it false when either document's version changes.
 *
 * Returns null when settings can't be read (throttle, outage). Callers let
 * the request through in that case rather than locking everyone out of the
 * app; the next page load checks again.
 */
export const getConsentGiven = cache(async (): Promise<boolean | null> => {
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
