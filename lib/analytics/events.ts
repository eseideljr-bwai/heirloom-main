/**
 * The two conversion events, each fired once, only after the API confirmed
 * success. Thin wrappers over track() that own the "once" rule.
 *
 *   sign_up                 first-time onboarding completion: POST
 *                           /onboarding/profile, or accepting an invitation
 *                           while onboarding was still pending (D8).
 *   first_kinloom_created   the member's first kinloom made final (D7).
 *
 * "Once" is remembered per member in localStorage (a flag with the member's
 * Kinloom id; never sent anywhere). Without analytics consent nothing is
 * sent and no extra API call is made.
 */

import { kinloomApi } from '../kinloom-api';
import { track, trackAllowed } from './datalayer';

const FLAG = (event: string, memberId: string) => `kl_evt_${event}:${memberId}`;

function seen(event: string, memberId: string): boolean {
  try { return localStorage.getItem(FLAG(event, memberId)) === '1'; } catch { return false; }
}
function markSeen(event: string, memberId: string): void {
  try { localStorage.setItem(FLAG(event, memberId), '1'); } catch { /* storage disabled */ }
}

/** Call after onboarding completes for the first time (the API said so). */
export function trackSignUp(memberId: string | null | undefined): void {
  if (!memberId || seen('sign_up', memberId)) return;
  markSeen('sign_up', memberId);
  track('sign_up');
}

/**
 * Call after kinloom(s) were made final. `publishedNow` is how many this
 * action has made final so far (1 for the publish sheet; the running count
 * of successes in a Biographer batch). If every final kinloom the member has
 * is one of those, this was their first.
 */
export async function trackKinloomPublished(memberId: string | null | undefined, publishedNow: number): Promise<void> {
  if (!memberId || seen('first_kinloom_created', memberId)) return;
  if (!trackAllowed()) return;
  try {
    const page = await kinloomApi.get('/vault', { query: { status: 'final', per_page: 1 } });
    const total = page.meta.total;
    if (total < 1) return;
    markSeen('first_kinloom_created', memberId);
    if (total <= publishedNow) track('first_kinloom_created');
  } catch {
    // Analytics never affects the member: a failed read just skips it.
  }
}
