/**
 * Browser side of the HubSpot contact sync (POST /api/analytics/sync).
 *
 * Fire-and-forget: never awaited by the UI, never shows an error, never
 * throws. Identity is the HttpOnly session cookie (D12); the body carries a
 * reason code and, at most, an invitation reference or the member's own
 * sign-up marketing choice. Never property values, never emails.
 *
 * Member syncs fired close together are coalesced into one (2.5 s). Sign-up
 * and invitation syncs go straight out: they carry their own payload.
 *
 * Not tied to cookie consent: this is the member's account data, synced
 * server-side, not browser tracking. The server does nothing unless
 * HUBSPOT_SYNC_ENABLED=1.
 */

type MemberReason = 'sign_in' | 'onboarding' | 'kinloom' | 'family_space' | 'plan' | 'daily';

const ENDPOINT = '/api/analytics/sync';
const COALESCE_MS = 2500;
const DAY_KEY = (memberId: string) => `kl_sync_day:${memberId}`;

/** Higher wins when several are coalesced (only sign-up/onboarding change server rules). */
const PRIORITY: Record<MemberReason, number> = {
  onboarding: 6, sign_in: 5, family_space: 4, plan: 3, kinloom: 2, daily: 1,
};

let pendingReason: MemberReason | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let currentMemberId: string | null = null;

function post(body: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      keepalive: true, // survives the navigation that usually follows
    }).catch(() => {});
  } catch {
    // Never the member's problem.
  }
}

function localDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function markSyncedToday(): void {
  if (!currentMemberId) return;
  try { localStorage.setItem(DAY_KEY(currentMemberId), localDay()); } catch { /* storage disabled */ }
}

/** Set by the sync root so the daily rule is per member. */
export function setSyncMember(memberId: string | null): void {
  currentMemberId = memberId;
}

/** A member sync, after the API has confirmed the action succeeded. */
export function requestSync(reason: MemberReason): void {
  if (!pendingReason || PRIORITY[reason] > PRIORITY[pendingReason]) pendingReason = reason;
  if (timer) return;
  timer = setTimeout(() => {
    const r = pendingReason;
    pendingReason = null;
    timer = null;
    if (!r) return;
    markSyncedToday();
    post({ reason: r });
  }, COALESCE_MS);
}

/** After an invitation was created. Only its id; the server finds the email. */
export function requestInvitationSync(kind: 'home', id: string): void;
export function requestInvitationSync(kind: 'space', id: string, spaceId: string): void;
export function requestInvitationSync(kind: 'home' | 'space', id: string, spaceId?: string): void {
  if (!id) return;
  post({ reason: 'invitation', invitation: kind === 'space' ? { kind, id, space_id: spaceId } : { kind, id } });
}

/**
 * After the account was created. Sent once. With the email-arrival flag the
 * checkbox was hidden: send `from_marketing_email` and no opt-in value.
 */
export function requestSignupSync(choice: { marketingOptIn: boolean } | { fromMarketingEmail: true }): void {
  markSyncedToday();
  post(
    'fromMarketingEmail' in choice
      ? { reason: 'signup', from_marketing_email: true }
      : { reason: 'signup', marketing_opt_in: choice.marketingOptIn },
  );
}

/** First authenticated page load of the day, once per member per day. */
export function maybeDailySync(memberId: string): void {
  try {
    if (localStorage.getItem(DAY_KEY(memberId)) === localDay()) return;
  } catch {
    // Storage disabled: still at most one per page load.
  }
  requestSync('daily');
}
