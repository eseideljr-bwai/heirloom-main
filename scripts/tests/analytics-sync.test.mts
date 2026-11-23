/**
 * Unit tests for the Kinloom → HubSpot sync rules (lib/server/analytics-sync/core.ts),
 * against a fake Laravel reader and an in-memory HubSpot. No network.
 *
 *   npm run test:analytics
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HubSpotConflictError,
  P,
  ageBracket,
  parseSyncRequest,
  runSync,
  type Contact,
  type ContactProps,
  type HubSpotClient,
  type InvitationLike,
  type KinloomReader,
  type MeLike,
  type ProfileLike,
  type SyncDeps,
  type SyncRequest,
} from '../../lib/server/analytics-sync/core.ts';

const TODAY = new Date('2026-11-19T15:00:00Z');
const DAY = '2026-11-19';

// ─── Fakes ─────────────────────────────────────────────────────────

type ReaderOpts = {
  me?: Partial<MeLike> | 'fail';
  profile?: ProfileLike | 'fail';
  /** Final kinloom created_at values, newest first. */
  kinlooms?: string[] | 'fail';
  homeInvites?: InvitationLike[];
  spaceInvites?: Record<string, InvitationLike[] | null>;
};

function fakeReader(o: ReaderOpts = {}) {
  const calls: string[] = [];
  const me: MeLike = {
    email: 'Member@Example.com',
    onboarding_state: 'complete',
    plan: 'free',
    home: { id: 'home1' },
    spaces: [],
    ...(o.me && o.me !== 'fail' ? o.me : {}),
  };
  const reader: KinloomReader = {
    async me() {
      calls.push('me');
      // What serverApiFetch does with no HttpOnly identity cookie.
      if (o.me === 'fail') throw new Error('CredentialsUnavailableError');
      return me;
    },
    async profile() {
      calls.push('profile');
      if (o.profile === 'fail') throw Object.assign(new Error('rate_limited'), { status: 429 });
      return o.profile ?? { birth_date: '1980-06-01', gender: 'f' };
    },
    async finalKinloomsPage(page) {
      calls.push(`vault:${page}`);
      if (o.kinlooms === 'fail') throw new Error('rate_limited');
      const list = o.kinlooms ?? [];
      return { total: list.length, createdAt: list[page - 1] ?? null };
    },
    async homeInvitations(homeId) {
      calls.push(`home-manage:${homeId}`);
      return o.homeInvites ?? [];
    },
    async spaceInvitations(spaceId) {
      calls.push(`space-manage:${spaceId}`);
      return o.spaceInvites?.[spaceId] ?? null;
    },
  };
  return { reader, calls };
}

function fakeHubSpot(seed: Record<string, Record<string, string>> = {}, opts: { conflictOnce?: boolean; subscribeFails?: boolean } = {}) {
  const contacts = new Map<string, Contact>();
  let n = 0;
  for (const [email, props] of Object.entries(seed)) contacts.set(email, { id: `c${++n}`, properties: { email, ...props } });
  const log: { op: string; email?: string; id?: string; props?: ContactProps }[] = [];
  let conflict = !!opts.conflictOnce;
  const byId = (id: string) => [...contacts.values()].find(c => c.id === id)!;
  const client: HubSpotClient = {
    async getContactByEmail(email) {
      log.push({ op: 'get', email });
      const c = contacts.get(email);
      return c ? { id: c.id, properties: { ...c.properties } } : null;
    },
    async createContact(props) {
      log.push({ op: 'create', props });
      const email = props.email;
      if (conflict) {
        // Someone else created it between our read and our create.
        conflict = false;
        contacts.set(email, { id: `c${++n}`, properties: { email, [P.origin]: 'app_sign_in', [P.establishedDate]: '2026-11-18' } });
        throw new HubSpotConflictError();
      }
      if (contacts.has(email)) throw new HubSpotConflictError();
      const c = { id: `c${++n}`, properties: { ...props } };
      contacts.set(email, c);
      return { id: c.id };
    },
    async updateContact(id, props) {
      log.push({ op: 'update', id, props });
      Object.assign(byId(id).properties, props);
    },
    async subscribeWithConsent(email) {
      log.push({ op: 'subscribe', email });
      if (opts.subscribeFails) throw new Error('hubspot_subscribe_500');
    },
  };
  return { client, contacts, log, writes: () => log.filter(l => l.op === 'create' || l.op === 'update') };
}

function deps(reader: KinloomReader, hubspot: HubSpotClient, extra: Partial<SyncDeps> = {}): SyncDeps {
  return { kinloom: reader, hubspot, now: () => TODAY, subscriptionEnabled: false, ...extra };
}

const req = (r: Partial<SyncRequest> & { reason: SyncRequest['reason'] }) => r as SyncRequest;

// ─── parseSyncRequest: the browser can't supply values ────────────

test('parse: unknown reason or junk is rejected', () => {
  assert.equal(parseSyncRequest(null), null);
  assert.equal(parseSyncRequest({ reason: 'hack' }), null);
  assert.equal(parseSyncRequest('sign_in'), null);
});

test('parse: property values and invitee emails from the browser are dropped', () => {
  const r = parseSyncRequest({
    reason: 'daily',
    email: 'someone@else.com',
    properties: { kinloom_plan: 'paid_family_space' },
    kinloom_account_status: 'active',
    marketing_opt_in: true, // only valid with signup
  });
  assert.deepEqual(r, { reason: 'daily' });
  const inv = parseSyncRequest({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1', email: 'x@y.com' } });
  assert.deepEqual(inv, { reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } });
});

test('parse: invitation needs a valid kind and id; space needs space_id', () => {
  assert.equal(parseSyncRequest({ reason: 'invitation' }), null);
  assert.equal(parseSyncRequest({ reason: 'invitation', invitation: { kind: 'space', id: 'i1' } }), null);
  assert.equal(parseSyncRequest({ reason: 'invitation', invitation: { kind: 'home', id: '../../x' } }), null);
  assert.deepEqual(
    parseSyncRequest({ reason: 'invitation', invitation: { kind: 'space', id: 'i1', space_id: 's1' } }),
    { reason: 'invitation', invitation: { kind: 'space', id: 'i1', spaceId: 's1' } },
  );
});

test('parse: from_marketing_email wins over marketing_opt_in', () => {
  assert.deepEqual(parseSyncRequest({ reason: 'signup', from_marketing_email: true, marketing_opt_in: true }), { reason: 'signup', fromMarketingEmail: true });
  assert.deepEqual(parseSyncRequest({ reason: 'signup', marketing_opt_in: false }), { reason: 'signup', marketingOptIn: false });
});

// ─── Identity (D12) ────────────────────────────────────────────────

test('identity: no HttpOnly cookie identity (GET /me fails) → unauthenticated, nothing read or written', async () => {
  const { reader, calls } = fakeReader({ me: 'fail' });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'sign_in' }), deps(reader, hs.client));
  assert.equal(r.outcome, 'unauthenticated');
  assert.deepEqual(calls, ['me']);
  assert.equal(hs.log.length, 0);
});

test('identity: the contact is always the /me email, lowercased', async () => {
  const { reader } = fakeReader();
  const hs = fakeHubSpot();
  await runSync(req({ reason: 'sign_in' }), deps(reader, hs.client));
  assert.ok(hs.contacts.has('member@example.com'));
  assert.equal(hs.contacts.size, 1);
});

// ─── Snapshot ──────────────────────────────────────────────────────

test('snapshot: new member at sign-in → created with the full snapshot, app_sign_in, established date', async () => {
  const { reader, calls } = fakeReader({
    me: { plan: 'family', spaces: [{ id: 's1', role: 'owner' }] },
    profile: { birth_date: '1990-11-20', gender: 'm' }, // turns 36 tomorrow: 35 today
    kinlooms: ['2026-10-01T10:00:00Z', '2026-05-02T09:00:00Z', '2025-12-24T08:00:00Z'],
  });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'sign_in' }), deps(reader, hs.client));
  assert.equal(r.outcome, 'created');
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.status], 'active');
  assert.equal(c[P.origin], 'app_sign_in');
  assert.equal(c[P.establishedDate], DAY);
  assert.equal(c[P.plan], 'paid_family_space');
  assert.equal(c[P.ownsFamilySpace], 'true');
  assert.equal(c[P.kinloomsCreated], '3');
  assert.equal(c[P.firstKinloomDate], '2025-12-24');
  assert.equal(c[P.lastActiveDate], DAY);
  assert.equal(c[P.gender], 'male');
  assert.equal(c[P.ageBracket], '35_44'); // born 1990-11-20, the day before their 36th birthday → 35
  assert.equal(c[P.signupDate], undefined, 'signup date only on signup/onboarding (D4)');
  // Reads: /me, /me/profile, /vault page 1, /vault last page. Nothing else.
  assert.deepEqual(calls, ['me', 'profile', 'vault:1', 'vault:3']);
  // Never the birth date itself.
  assert.ok(!JSON.stringify(c).includes('1990'));
});

test('snapshot: existing contact → hubspot_existing, no established date, set-once fields kept', async () => {
  const { reader } = fakeReader({ kinlooms: ['2026-10-01T10:00:00Z', '2026-01-01T00:00:00Z'] });
  const hs = fakeHubSpot({
    'member@example.com': { [P.firstKinloomDate]: '2025-01-01', [P.signupDate]: '2025-01-01' },
  });
  const r = await runSync(req({ reason: 'onboarding' }), deps(reader, hs.client));
  assert.equal(r.outcome, 'updated');
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.origin], 'hubspot_existing');
  assert.equal(c[P.establishedDate], undefined);
  assert.equal(c[P.firstKinloomDate], '2025-01-01', 'first kinloom date is set once');
  assert.equal(c[P.signupDate], '2025-01-01', 'signup date is set once');
  assert.equal(c[P.kinloomsCreated], '2');
});

test('snapshot: origin never changes once set', async () => {
  const { reader } = fakeReader();
  const hs = fakeHubSpot({ 'member@example.com': { [P.origin]: 'invitation', [P.status]: 'invited' } });
  await runSync(req({ reason: 'sign_in' }), deps(reader, hs.client));
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.origin], 'invitation');
  assert.equal(c[P.status], 'active', 'an invitee who signs up becomes active');
});

test('snapshot: deleting a kinloom lowers the count (current count, not a counter)', async () => {
  const hs = fakeHubSpot();
  await runSync(req({ reason: 'kinloom' }), deps(fakeReader({ kinlooms: ['2026-02-01T00:00:00Z', '2026-01-01T00:00:00Z'] }).reader, hs.client));
  await runSync(req({ reason: 'kinloom' }), deps(fakeReader({ kinlooms: ['2026-01-01T00:00:00Z'] }).reader, hs.client));
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.kinloomsCreated], '1');
  assert.equal(c[P.firstKinloomDate], '2026-01-01');
});

test('snapshot: signup date set on signup and onboarding, once', async () => {
  const hs = fakeHubSpot();
  const { reader } = fakeReader({ me: { onboarding_state: 'profile_pending' } });
  await runSync(req({ reason: 'signup', marketingOptIn: false }), deps(reader, hs.client));
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.signupDate], DAY);
  const later = { ...deps(fakeReader().reader, hs.client), now: () => new Date('2026-11-25T00:00:00Z') };
  await runSync(req({ reason: 'onboarding' }), later);
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.signupDate], DAY);
});

test('snapshot: signup reads only /me', async () => {
  const { reader, calls } = fakeReader({ me: { onboarding_state: 'profile_pending' } });
  await runSync(req({ reason: 'signup', marketingOptIn: true }), deps(reader, fakeHubSpot().client));
  assert.deepEqual(calls, ['me']);
});

test('snapshot: no kinlooms → count 0, one vault read, no first date', async () => {
  const { reader, calls } = fakeReader({ kinlooms: [] });
  const hs = fakeHubSpot();
  await runSync(req({ reason: 'daily' }), deps(reader, hs.client));
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.kinloomsCreated], '0');
  assert.equal(c[P.firstKinloomDate], undefined);
  assert.deepEqual(calls, ['me', 'profile', 'vault:1']);
});

test('snapshot: plan and gender mappings; gender empty when unset', async () => {
  for (const [plan, want] of [['free', 'free'], ['home', 'paid_home'], ['family', 'paid_family_space']] as const) {
    const hs = fakeHubSpot();
    await runSync(req({ reason: 'daily' }), deps(fakeReader({ me: { plan } }).reader, hs.client));
    assert.equal(hs.contacts.get('member@example.com')!.properties[P.plan], want);
  }
  for (const [g, want] of [['f', 'female'], ['m', 'male'], ['n', 'undisclosed'], [null, '']] as const) {
    const hs = fakeHubSpot();
    await runSync(req({ reason: 'daily' }), deps(fakeReader({ profile: { birth_date: null, gender: g } }).reader, hs.client));
    const c = hs.contacts.get('member@example.com')!.properties;
    assert.equal(c[P.gender], want);
    assert.equal(c[P.ageBracket], '');
  }
});

test('age brackets: boundaries', () => {
  const t = new Date('2026-06-15T00:00:00Z');
  assert.equal(ageBracket('2008-06-16', t), 'under_18'); // 17
  assert.equal(ageBracket('2008-06-15', t), '18_24');    // 18 today
  assert.equal(ageBracket('2001-06-15', t), '25_34');
  assert.equal(ageBracket('1992-06-16', t), '25_34');    // 33
  assert.equal(ageBracket('1991-06-15', t), '35_44');
  assert.equal(ageBracket('1981-06-15', t), '45_54');
  assert.equal(ageBracket('1971-06-15', t), '55_64');
  assert.equal(ageBracket('1961-06-15', t), '65_plus');
  assert.equal(ageBracket(null, t), '');
  assert.equal(ageBracket('not a date', t), '');
});

// ─── Never downgrade ───────────────────────────────────────────────

test('never downgrade: a member still pending onboarding never writes a status', async () => {
  const hs = fakeHubSpot({ 'member@example.com': { [P.status]: 'active' } });
  await runSync(req({ reason: 'daily' }), deps(fakeReader({ me: { onboarding_state: 'profile_pending' } }).reader, hs.client));
  const update = hs.writes()[0].props!;
  assert.equal(update[P.status], undefined);
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.status], 'active');
});

test('never downgrade: the invitee sync never touches an active contact', async () => {
  const { reader } = fakeReader({ homeInvites: [{ id: 'inv1', email: 'Grandma@Example.com' }] });
  const hs = fakeHubSpot({ 'grandma@example.com': { [P.status]: 'active', [P.origin]: 'app_sign_in' } });
  const r = await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } }), deps(reader, hs.client));
  assert.equal(r.outcome, 'ignored');
  assert.equal(hs.writes().length, 0);
});

// ─── Invitees ──────────────────────────────────────────────────────

test('invitee: verified through the Home manage endpoint; created invited + date only, non-marketing', async () => {
  const { reader, calls } = fakeReader({ homeInvites: [{ id: 'other', email: 'x@example.com' }, { id: 'inv1', email: 'Grandma@Example.com' }] });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } }), deps(reader, hs.client));
  assert.equal(r.outcome, 'created');
  assert.deepEqual(calls, ['me', 'home-manage:home1']);
  assert.deepEqual(hs.contacts.get('grandma@example.com')!.properties, {
    email: 'grandma@example.com',
    [P.status]: 'invited',
    [P.invitedDate]: DAY,
    [P.origin]: 'invitation',
    [P.establishedDate]: DAY,
  });
  // The member's own contact is not touched by an invitation sync.
  assert.equal(hs.contacts.has('member@example.com'), false);
});

test('invitee: an id that is not a pending invitation of this member → nothing written', async () => {
  const { reader } = fakeReader({ homeInvites: [{ id: 'inv1', email: 'grandma@example.com' }] });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'forged' } }), deps(reader, hs.client));
  assert.equal(r.outcome, 'ignored');
  assert.equal(hs.log.length, 0);
});

test('invitee: Space invitations only for a Space the member owns', async () => {
  const space = { s1: [{ id: 'inv9', email: 'cousin@example.com' }] };
  // Member of s1, not owner → no read, nothing written.
  let f = fakeReader({ me: { spaces: [{ id: 's1', role: 'member' }] }, spaceInvites: space });
  let hs = fakeHubSpot();
  let r = await runSync(req({ reason: 'invitation', invitation: { kind: 'space', id: 'inv9', spaceId: 's1' } }), deps(f.reader, hs.client));
  assert.equal(r.outcome, 'ignored');
  assert.deepEqual(f.calls, ['me']);
  assert.equal(hs.log.length, 0);
  // Owner → verified and created.
  f = fakeReader({ me: { spaces: [{ id: 's1', role: 'owner' }] }, spaceInvites: space });
  hs = fakeHubSpot();
  r = await runSync(req({ reason: 'invitation', invitation: { kind: 'space', id: 'inv9', spaceId: 's1' } }), deps(f.reader, hs.client));
  assert.equal(r.outcome, 'created');
  assert.deepEqual(f.calls, ['me', 'space-manage:s1']);
  assert.equal(hs.contacts.get('cousin@example.com')!.properties[P.status], 'invited');
});

test('invitee: manage endpoint returns null (not owner) → ignored', async () => {
  const f = fakeReader({ me: { spaces: [{ id: 's1', role: 'owner' }] }, spaceInvites: { s1: null } });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'invitation', invitation: { kind: 'space', id: 'inv9', spaceId: 's1' } }), deps(f.reader, hs.client));
  assert.equal(r.outcome, 'ignored');
  assert.equal(hs.log.length, 0);
});

test('invitee: existing non-active contact → invited; invited date and origin set once', async () => {
  const { reader } = fakeReader({ homeInvites: [{ id: 'inv1', email: 'grandma@example.com' }] });
  const hs = fakeHubSpot({ 'grandma@example.com': { [P.invitedDate]: '2026-01-01', [P.status]: 'invited', [P.origin]: 'invitation' } });
  await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } }), deps(reader, hs.client));
  const c = hs.contacts.get('grandma@example.com')!.properties;
  assert.equal(c[P.invitedDate], '2026-01-01');
  assert.equal(c[P.origin], 'invitation');
  assert.equal(c[P.establishedDate], undefined);
});

test('invitee: a marketing-list contact gets hubspot_existing and no established date', async () => {
  const { reader } = fakeReader({ homeInvites: [{ id: 'inv1', email: 'grandma@example.com' }] });
  const hs = fakeHubSpot({ 'grandma@example.com': { hs_marketable_status: 'true' } });
  await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } }), deps(reader, hs.client));
  const c = hs.contacts.get('grandma@example.com')!.properties;
  assert.equal(c[P.origin], 'hubspot_existing');
  assert.equal(c[P.establishedDate], undefined);
  assert.equal(c[P.status], 'invited');
});

test('invitee: inviting your own email is ignored', async () => {
  const { reader } = fakeReader({ homeInvites: [{ id: 'inv1', email: 'member@example.com' }] });
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'invitation', invitation: { kind: 'home', id: 'inv1' } }), deps(reader, hs.client));
  assert.equal(r.outcome, 'ignored');
});

// ─── Marketing choice at sign-up ───────────────────────────────────

const pending = { me: { onboarding_state: 'profile_pending' as const } };

test('from_marketing_email: already a marketing contact → prior_consent + date, status untouched', async () => {
  const hs = fakeHubSpot({ 'member@example.com': { hs_marketable_status: 'true' } });
  await runSync(req({ reason: 'signup', fromMarketingEmail: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true }));
  const update = hs.writes()[0].props!;
  assert.equal(update[P.marketingOptIn], 'prior_consent');
  assert.equal(update[P.marketingOptInDate], DAY);
  assert.equal(update.hs_marketable_status, undefined, 'marketing status is never written');
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false, 'no subscription change');
});

test('from_marketing_email: forwarded link (address not a marketing contact) → nothing opted in', async () => {
  const hs = fakeHubSpot({ 'member@example.com': { hs_marketable_status: 'false' } });
  await runSync(req({ reason: 'signup', fromMarketingEmail: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true }));
  const update = hs.writes()[0].props!;
  assert.equal(update[P.marketingOptIn], undefined);
  assert.equal(update[P.marketingOptInDate], undefined);
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false);
});

test('from_marketing_email: no contact at all → created non-marketing, opt-in empty', async () => {
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'signup', fromMarketingEmail: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true }));
  assert.equal(r.outcome, 'created');
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.marketingOptIn], undefined);
  assert.equal(c.hs_marketable_status, undefined);
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false);
});

test('opt-in checked + legal basis supported → yes + date, subscription opt-in', async () => {
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'signup', marketingOptIn: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true }));
  assert.equal(r.subscribed, true);
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.marketingOptIn], 'yes');
  assert.equal(c[P.marketingOptInDate], DAY);
  const sub = hs.log.find(l => l.op === 'subscribe')!;
  assert.equal(sub.email, 'member@example.com', 'only the /me email, never another');
  assert.equal(c.hs_marketable_status, undefined);
});

test('opt-in checked, no legal basis support → property only (D11 deferred)', async () => {
  const hs = fakeHubSpot();
  const r = await runSync(req({ reason: 'signup', marketingOptIn: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: false }));
  assert.equal(r.subscribed, false);
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.marketingOptIn], 'yes');
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false);
});

test('opt-in checked, subscription call fails → choice still recorded, sync succeeds', async () => {
  const warns: string[] = [];
  const hs = fakeHubSpot({}, { subscribeFails: true });
  const r = await runSync(req({ reason: 'signup', marketingOptIn: true }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true, warn: c => warns.push(c) }));
  assert.equal(r.outcome, 'created');
  assert.equal(r.subscribed, false);
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.marketingOptIn], 'yes');
  assert.deepEqual(warns, ['hubspot_subscribe_failed']);
});

test('opt-in unchecked → no + date; an existing marketing contact keeps its status; never unsubscribed', async () => {
  const hs = fakeHubSpot({ 'member@example.com': { hs_marketable_status: 'true' } });
  await runSync(req({ reason: 'signup', marketingOptIn: false }), deps(fakeReader(pending).reader, hs.client, { subscriptionEnabled: true }));
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.marketingOptIn], 'no');
  assert.equal(c[P.marketingOptInDate], DAY);
  assert.equal(c.hs_marketable_status, 'true');
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false);
});

test('marketing fields are ignored outside sign-up', async () => {
  const hs = fakeHubSpot();
  await runSync({ reason: 'daily', marketingOptIn: true } as SyncRequest, deps(fakeReader().reader, hs.client, { subscriptionEnabled: true }));
  assert.equal(hs.contacts.get('member@example.com')!.properties[P.marketingOptIn], undefined);
  assert.equal(hs.log.some(l => l.op === 'subscribe'), false);
});

// ─── Failure handling ──────────────────────────────────────────────

test('a Laravel read failure (e.g. 429) → skipped, nothing written to HubSpot', async () => {
  for (const o of [{ profile: 'fail' as const }, { kinlooms: 'fail' as const }]) {
    const hs = fakeHubSpot();
    const r = await runSync(req({ reason: 'daily' }), deps(fakeReader(o).reader, hs.client));
    assert.equal(r.outcome, 'skipped');
    assert.equal(hs.log.length, 0, 'no HubSpot call at all, so no partial snapshot');
  }
});

test('HubSpot failures propagate to the route (which answers 204 and logs a code)', async () => {
  const hs = fakeHubSpot();
  hs.client.getContactByEmail = async () => { throw new Error('hubspot_get_503'); };
  await assert.rejects(runSync(req({ reason: 'daily' }), deps(fakeReader().reader, hs.client)), /hubspot_get_503/);
});

test('create race: contact appears between read and create → updated, origin and established date kept', async () => {
  const hs = fakeHubSpot({}, { conflictOnce: true });
  const r = await runSync(req({ reason: 'sign_in' }), deps(fakeReader().reader, hs.client));
  assert.equal(r.outcome, 'updated');
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(c[P.origin], 'app_sign_in');
  assert.equal(c[P.establishedDate], '2026-11-18');
  assert.equal(c[P.status], 'active');
  assert.equal(hs.contacts.size, 1, 'no duplicate');
});

test('repeat sign-in: no duplicate, origin and established date unchanged', async () => {
  const hs = fakeHubSpot();
  await runSync(req({ reason: 'sign_in' }), deps(fakeReader().reader, hs.client));
  const first = { ...hs.contacts.get('member@example.com')!.properties };
  await runSync(req({ reason: 'sign_in' }), { ...deps(fakeReader().reader, hs.client), now: () => new Date('2026-12-01T00:00:00Z') });
  const c = hs.contacts.get('member@example.com')!.properties;
  assert.equal(hs.contacts.size, 1);
  assert.equal(c[P.origin], first[P.origin]);
  assert.equal(c[P.establishedDate], first[P.establishedDate]);
  assert.equal(c[P.lastActiveDate], '2026-12-01');
});
