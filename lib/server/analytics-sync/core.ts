/**
 * Kinloom → HubSpot contact sync: the rules, with no I/O of its own.
 *
 * Everything external comes in through `SyncDeps` (the Laravel reads, made
 * with the member's own HttpOnly-cookie identity, and the HubSpot client), so
 * the rules are unit-tested against fakes (scripts/tests/analytics-sync.test.mts).
 * Keep this file free of runtime imports: the tests load it directly in Node.
 *
 * Contract (handoff, Phase 2):
 *   - The browser sends a reason code and, at most, an invitation reference or
 *     the member's own sign-up marketing choice. Never property values or
 *     invitee emails.
 *   - GET /me is the proof of identity and the source of the member's email.
 *     Any read failure → no write at all (no partial snapshot).
 *   - Full snapshots, upserted by email. Set-once fields are only written when
 *     HubSpot has them empty. `active` is never downgraded.
 *   - Marketing contact status is never touched (D11 deferred): sign-up
 *     consent is recorded in kinloom_marketing_opt_in (+ date), plus a
 *     subscription opt-in only when the account supports a legal basis.
 */

// ─── Inputs ────────────────────────────────────────────────────────

export const REASONS = ['sign_in', 'signup', 'onboarding', 'kinloom', 'invitation', 'family_space', 'plan', 'daily'] as const;
export type Reason = (typeof REASONS)[number];

export type InvitationRef = { kind: 'home' | 'space'; id: string; spaceId?: string };

export type SyncRequest = {
  reason: Reason;
  invitation?: InvitationRef;
  /** The member's own choice at sign-up. Only read when reason === 'signup'. */
  marketingOptIn?: boolean;
  /** Arrived from a HubSpot email (browser flag). Never consent on its own. */
  fromMarketingEmail?: boolean;
};

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Validate the browser's JSON body. Anything not listed is dropped, so
 * property values or emails sent by a client are simply ignored.
 */
export function parseSyncRequest(body: unknown): SyncRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.reason !== 'string' || !(REASONS as readonly string[]).includes(b.reason)) return null;
  const req: SyncRequest = { reason: b.reason as Reason };

  if (req.reason === 'invitation') {
    const inv = b.invitation as Record<string, unknown> | undefined;
    if (!inv || (inv.kind !== 'home' && inv.kind !== 'space')) return null;
    if (typeof inv.id !== 'string' || !ID_RE.test(inv.id)) return null;
    const ref: InvitationRef = { kind: inv.kind, id: inv.id };
    if (inv.kind === 'space') {
      if (typeof inv.space_id !== 'string' || !ID_RE.test(inv.space_id)) return null;
      ref.spaceId = inv.space_id;
    }
    req.invitation = ref;
  }

  if (req.reason === 'signup') {
    if (b.from_marketing_email === true) req.fromMarketingEmail = true;
    else if (typeof b.marketing_opt_in === 'boolean') req.marketingOptIn = b.marketing_opt_in;
  }
  return req;
}

// ─── What the Laravel API gives us (the fields we use) ─────────────

export type MeLike = {
  email: string;
  onboarding_state: 'profile_pending' | 'complete';
  plan: 'free' | 'home' | 'family';
  home: { id: string };
  spaces: { id: string; role: 'owner' | 'member' }[];
};

export type ProfileLike = {
  birth_date: string | null;
  gender: 'f' | 'm' | 'n' | null;
};

export type InvitationLike = { id: string; email: string };

export interface KinloomReader {
  me(): Promise<MeLike>;
  profile(): Promise<ProfileLike>;
  /** GET /vault?status=final&per_page=1&page=N → meta.total and data[0].created_at. */
  finalKinloomsPage(page: number): Promise<{ total: number; createdAt: string | null }>;
  /** GET /family-homes/{id}/manage → invitations (pending only). */
  homeInvitations(homeId: string): Promise<InvitationLike[]>;
  /** GET /family-spaces/{id}/manage → invitations, or null for non-owners. */
  spaceInvitations(spaceId: string): Promise<InvitationLike[] | null>;
}

// ─── HubSpot ──────────────────────────────────────────────────────

export type ContactProps = Record<string, string>;
export type Contact = { id: string; properties: Record<string, string | null | undefined> };

export class HubSpotConflictError extends Error {
  constructor() { super('hubspot_conflict'); }
}

export interface HubSpotClient {
  getContactByEmail(email: string, properties: string[]): Promise<Contact | null>;
  /** Throws HubSpotConflictError when a contact with this email already exists. */
  createContact(properties: ContactProps): Promise<{ id: string }>;
  updateContact(id: string, properties: ContactProps): Promise<void>;
  /** Communication Preferences opt-in with legal basis "consent with notice". */
  subscribeWithConsent(email: string): Promise<void>;
}

export type SyncDeps = {
  kinloom: KinloomReader;
  hubspot: HubSpotClient;
  now: () => Date;
  /** True only when a subscription id is configured AND the account supports a legal basis. */
  subscriptionEnabled: boolean;
  warn?: (code: string) => void;
};

// ─── Properties ────────────────────────────────────────────────────

export const P = {
  status: 'kinloom_account_status',
  signupDate: 'kinloom_signup_date',
  ageBracket: 'kinloom_age_bracket',
  gender: 'kinloom_gender',
  firstKinloomDate: 'kinloom_first_kinloom_date',
  kinloomsCreated: 'kinloom_kinlooms_created',
  ownsFamilySpace: 'kinloom_owns_family_space',
  lastActiveDate: 'kinloom_last_active_date',
  plan: 'kinloom_plan',
  invitedDate: 'kinloom_invited_date',
  origin: 'kinloom_contact_origin',
  establishedDate: 'kinloom_established_date',
  marketingOptIn: 'kinloom_marketing_opt_in',
  marketingOptInDate: 'kinloom_marketing_opt_in_date',
} as const;

/** HubSpot's own read-only marketing status, read for the email-arrival guard. */
export const HS_MARKETABLE = 'hs_marketable_status';

export const READ_PROPERTIES = [
  P.status, P.signupDate, P.firstKinloomDate, P.invitedDate, P.origin,
  P.establishedDate, P.marketingOptIn, HS_MARKETABLE,
];

/** 'YYYY-MM-DD' in UTC — HubSpot date properties take ISO dates. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function ageBracket(birthDate: string | null | undefined, today: Date): string {
  if (!birthDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let age = today.getUTCFullYear() - y;
  const beforeBirthday =
    today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 130) return '';
  if (age < 18) return 'under_18';
  if (age <= 24) return '18_24';
  if (age <= 34) return '25_34';
  if (age <= 44) return '35_44';
  if (age <= 54) return '45_54';
  if (age <= 64) return '55_64';
  return '65_plus';
}

export function genderValue(g: ProfileLike['gender']): string {
  if (g === 'f') return 'female';
  if (g === 'm') return 'male';
  if (g === 'n') return 'undisclosed';
  return '';
}

export function planValue(plan: MeLike['plan']): string {
  if (plan === 'home') return 'paid_home';
  if (plan === 'family') return 'paid_family_space';
  return 'free';
}

const empty = (v: string | null | undefined) => v === null || v === undefined || v === '';

/** Copy set-once fields into `props` only where HubSpot has them empty. */
function setOnce(props: ContactProps, existing: Contact | null, values: ContactProps): void {
  for (const [k, v] of Object.entries(values)) {
    if (!v) continue;
    if (!existing || empty(existing.properties[k])) props[k] = v;
  }
}

// ─── Result (for the route's status code and the tests) ───────────

export type SyncOutcome =
  | 'unauthenticated'   // GET /me failed: no identity → nothing done
  | 'skipped'           // a Laravel read failed: nothing written
  | 'ignored'           // nothing to do (e.g. invitation not found, active invitee)
  | 'created'
  | 'updated';

export type SyncResult = {
  outcome: SyncOutcome;
  detail?: string;
  /** What was written, for tests. Never logged. */
  written?: { contactId: string; properties: ContactProps };
  subscribed?: boolean;
};

// ─── Member snapshot ──────────────────────────────────────────────

type Snapshot = { always: ContactProps; once: ContactProps };

async function memberSnapshot(req: SyncRequest, me: MeLike, deps: SyncDeps): Promise<Snapshot> {
  const today = deps.now();
  const day = isoDay(today);
  const always: ContactProps = {
    [P.plan]: planValue(me.plan),
    [P.ownsFamilySpace]: me.spaces.some(s => s.role === 'owner') ? 'true' : 'false',
    [P.lastActiveDate]: day,
  };
  // `active` only; a member is never written as `invited` (never downgraded).
  if (me.onboarding_state === 'complete') always[P.status] = 'active';

  const once: ContactProps = {};
  // D4: going forward only, the day of the sign-up / onboarding sync.
  if (req.reason === 'signup' || req.reason === 'onboarding') once[P.signupDate] = day;

  // At sign-up the account is seconds old: no profile, no kinlooms. Reading
  // only /me there keeps the consent record from depending on extra reads.
  if (req.reason === 'signup') return { always, once };

  const profile = await deps.kinloom.profile();
  always[P.ageBracket] = ageBracket(profile.birth_date, today);
  always[P.gender] = genderValue(profile.gender);

  // D7: final kinlooms only. Newest first, so the last page holds the oldest.
  const first = await deps.kinloom.finalKinloomsPage(1);
  always[P.kinloomsCreated] = String(first.total);
  if (first.total > 0) {
    const oldest = first.total === 1 ? first : await deps.kinloom.finalKinloomsPage(first.total);
    if (oldest.createdAt) once[P.firstKinloomDate] = oldest.createdAt.slice(0, 10);
  }
  return { always, once };
}

// ─── Entry point ──────────────────────────────────────────────────

export async function runSync(req: SyncRequest, deps: SyncDeps): Promise<SyncResult> {
  let me: MeLike;
  try {
    me = await deps.kinloom.me();
  } catch {
    return { outcome: 'unauthenticated' };
  }
  const email = (me.email || '').trim().toLowerCase();
  if (!email) return { outcome: 'unauthenticated' };

  if (req.reason === 'invitation') return syncInvitee(req, me, email, deps);
  return syncMember(req, me, email, deps);
}

async function syncMember(req: SyncRequest, me: MeLike, email: string, deps: SyncDeps): Promise<SyncResult> {
  let snap: Snapshot;
  try {
    snap = await memberSnapshot(req, me, deps);
  } catch {
    deps.warn?.('laravel_read_failed');
    return { outcome: 'skipped', detail: 'laravel_read_failed' };
  }

  const today = isoDay(deps.now());
  const existing = await deps.hubspot.getContactByEmail(email, READ_PROPERTIES);

  const props: ContactProps = { ...snap.always };
  setOnce(props, existing, snap.once);

  // Origin: set once. A contact that was there before the app's first sync is
  // `hubspot_existing`; one the app creates is `app_sign_in`.
  if (existing && empty(existing.properties[P.origin])) props[P.origin] = 'hubspot_existing';

  // ── Sign-up marketing choice (D11 deferred: status never touched) ──
  let wantSubscribe = false;
  if (req.reason === 'signup') {
    if (req.fromMarketingEmail) {
      // Forwarded emails are common in families: the flag alone is never
      // consent. Only an address HubSpot already holds as a marketing
      // contact counts as prior consent.
      if (existing && existing.properties[HS_MARKETABLE] === 'true') {
        props[P.marketingOptIn] = 'prior_consent';
        props[P.marketingOptInDate] = today;
      }
    } else if (req.marketingOptIn === true) {
      props[P.marketingOptIn] = 'yes';
      props[P.marketingOptInDate] = today;
      wantSubscribe = deps.subscriptionEnabled;
    } else if (req.marketingOptIn === false) {
      // Never unsubscribes anyone, never changes an existing status.
      props[P.marketingOptIn] = 'no';
      props[P.marketingOptInDate] = today;
    }
  }

  let contactId: string;
  let outcome: SyncOutcome;
  if (existing) {
    await deps.hubspot.updateContact(existing.id, props);
    contactId = existing.id;
    outcome = 'updated';
  } else {
    const createProps: ContactProps = {
      email,
      ...props,
      [P.origin]: 'app_sign_in',
      [P.establishedDate]: today,
    };
    try {
      contactId = (await deps.hubspot.createContact(createProps)).id;
      outcome = 'created';
      Object.assign(props, createProps);
    } catch (err) {
      if (!(err instanceof HubSpotConflictError)) throw err;
      // Created by a concurrent sync between our read and our create:
      // re-read and apply as an update so set-once rules still hold.
      const now = await deps.hubspot.getContactByEmail(email, READ_PROPERTIES);
      if (!now) throw err;
      const retry: ContactProps = { ...snap.always };
      setOnce(retry, now, snap.once);
      for (const k of [P.marketingOptIn, P.marketingOptInDate]) if (props[k]) retry[k] = props[k];
      await deps.hubspot.updateContact(now.id, retry);
      contactId = now.id;
      outcome = 'updated';
      Object.keys(props).forEach(k => delete props[k]);
      Object.assign(props, retry);
    }
  }

  let subscribed = false;
  if (wantSubscribe) {
    try {
      await deps.hubspot.subscribeWithConsent(email);
      subscribed = true;
    } catch {
      // The property still records the member's choice; the subscription can
      // be applied in HubSpot. Logged without the address.
      deps.warn?.('hubspot_subscribe_failed');
    }
  }
  return { outcome, written: { contactId, properties: props }, subscribed };
}

async function syncInvitee(req: SyncRequest, me: MeLike, memberEmail: string, deps: SyncDeps): Promise<SyncResult> {
  const ref = req.invitation;
  if (!ref) return { outcome: 'ignored', detail: 'no_invitation' };

  // The invitee's email comes from the API, read with the member's own
  // identity, never from the request.
  let list: InvitationLike[] | null;
  try {
    if (ref.kind === 'home') {
      list = await deps.kinloom.homeInvitations(me.home.id);
    } else {
      // Only a Space the member owns: the manage endpoint is owner-only anyway.
      const owns = me.spaces.some(s => s.id === ref.spaceId && s.role === 'owner');
      if (!owns || !ref.spaceId) return { outcome: 'ignored', detail: 'space_not_owned' };
      list = await deps.kinloom.spaceInvitations(ref.spaceId);
    }
  } catch {
    deps.warn?.('laravel_read_failed');
    return { outcome: 'skipped', detail: 'laravel_read_failed' };
  }

  const invitation = (list ?? []).find(i => i.id === ref.id);
  if (!invitation) return { outcome: 'ignored', detail: 'invitation_not_found' };
  const inviteeEmail = (invitation.email || '').trim().toLowerCase();
  if (!inviteeEmail || inviteeEmail === memberEmail) return { outcome: 'ignored', detail: 'invitee_is_member' };

  const today = isoDay(deps.now());
  const existing = await deps.hubspot.getContactByEmail(inviteeEmail, READ_PROPERTIES);

  if (existing) {
    // Never touch an active contact.
    if (existing.properties[P.status] === 'active') return { outcome: 'ignored', detail: 'invitee_active' };
    const props: ContactProps = { [P.status]: 'invited' };
    setOnce(props, existing, { [P.invitedDate]: today, [P.origin]: 'hubspot_existing' });
    await deps.hubspot.updateContact(existing.id, props);
    return { outcome: 'updated', written: { contactId: existing.id, properties: props } };
  }

  // Status and invited date only (plus how the app came to create it).
  // Non-marketing: the sync never sets marketing status.
  const props: ContactProps = {
    email: inviteeEmail,
    [P.status]: 'invited',
    [P.invitedDate]: today,
    [P.origin]: 'invitation',
    [P.establishedDate]: today,
  };
  try {
    const { id } = await deps.hubspot.createContact(props);
    return { outcome: 'created', written: { contactId: id, properties: props } };
  } catch (err) {
    if (!(err instanceof HubSpotConflictError)) throw err;
    return { outcome: 'ignored', detail: 'invitee_created_concurrently' };
  }
}
