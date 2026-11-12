'use client';

/**
 * Get started on Kinloom: eight steps, each opening the page it describes
 * with a short tip anchored to where that page lives in the navigation.
 *
 * Progress lives on the account, so it follows the person across devices:
 *
 *   training_wizard.active  false once "Don't show again" is checked
 *                           (GET /me, PATCH /me/settings)
 *   training_wizard.steps   step key → true when checked off; PATCH merges
 *                           it, so each change sends only its own step
 *   sessionStorage          the step the person is walking through from the
 *                           checklist or Previous/Next, in this tab only
 *
 * A tip shows on its step's page until that step is checked off, in the
 * checklist or in the tip's Done box: the two are the same state, and a
 * checked-off step is struck through in the checklist. × closes a tip on the
 * page you are on and nothing more (GetStartedTip keeps that). "Don't show
 * again" hides the checklist and every tip; Settings → Account shows the
 * same value as "Onboarding complete", and unchecking it there starts over.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { AuthUser } from './auth';
import { patchSettings } from './settings';
import type { components } from './api-schema/typed';

type TrainingWizard = components['schemas']['TrainingWizard'];
type TrainingWizardChanges = components['schemas']['TrainingWizardChanges'];

export type TipAnchor = 'create' | 'account' | 'home' | 'library' | 'manage' | 'spaces';

export type StepKey = 'home' | 'create' | 'vault' | 'portrait' | 'bank' | 'library' | 'manage' | 'spaces';

/** What a step's page match can depend on beyond the path. */
export type MatchContext = {
  personId: string;
  /** The step being walked through from the checklist or Previous/Next. */
  walking: StepKey | null;
  /** In no Family Space yet, so the Spaces screens are their empty state. */
  noSpaces: boolean;
};

export type GetStartedStep = {
  key: StepKey;
  /** 1-based position, shown in the tip and the checklist. */
  n: number;
  title: string;
  /** How the previous step's Next button names this one, when not `title`. */
  nextLabel?: string;
  /** Where the checklist row and Previous/Next go. */
  href: string;
  /** Whether the tip belongs on this page. The `/me` routes redirect to a person id. */
  matches: (pathname: string, ctx: MatchContext) => boolean;
  anchor: TipAnchor;
  tip: string;
  where: string;
};

const STEPS: Omit<GetStartedStep, 'n'>[] = [
  {
    key: 'home',
    title: 'Welcome Home',
    href: '/home',
    matches: p => p === '/home',
    anchor: 'home',
    tip: 'This is your Family Home — a private place for the people under your roof. Whatever you publish here is the first thing they see, and nothing leaves it unless you send it on to a Family Space.',
    where: 'My Home, in the main navigation. The Kinloom logo always brings you back here.',
  },
  {
    key: 'create',
    title: 'Create a kinloom',
    href: '/create',
    matches: p => p === '/create',
    anchor: 'create',
    tip: 'Choose how you would like to begin — talk it through, write it, import something you already have, or record it. Nothing is shared until you decide.',
    where: 'Always one click away: Create a kinloom, top right.',
  },
  {
    key: 'vault',
    title: 'See your Vault',
    href: '/vault',
    matches: p => p === '/vault',
    anchor: 'account',
    tip: 'Everything you write lands here first, private to you. The filters show what is private and what you have published, and where.',
    where: 'Find it from your photo, top right → My Vault.',
  },
  {
    key: 'portrait',
    title: 'See your Portrait',
    href: '/portrait/me',
    // Your own Portrait only, never someone else's.
    matches: (p, { personId }) => p === `/portrait/${personId}`,
    anchor: 'account',
    tip: 'This is how your family will come to know you. It fills in as you write — your words, your kinlooms, the line people remember.',
    where: 'Find it from your photo, top right → My Portrait.',
  },
  {
    key: 'bank',
    title: 'Test your Legacy Bank',
    nextLabel: 'Your Legacy Bank',
    href: '/legacy-bank/me',
    matches: (p, { personId }) => p === `/legacy-bank/${personId}`,
    anchor: 'account',
    tip: 'Ask a question about what you have written. Answers come only from your own kinlooms. Try one of the suggested questions to see how it works.',
    where: 'Find it from your photo, top right → My Legacy Bank.',
  },
  {
    key: 'library',
    title: 'See your Family Library',
    nextLabel: 'Your Family Library',
    href: '/library',
    matches: p => p === '/library',
    anchor: 'library',
    tip: 'Every kinloom published to your home, in one place. Each one still lives in the vault of whoever wrote it.',
    where: 'Our Library, in the main navigation.',
  },
  {
    key: 'manage',
    title: 'Manage your Family Home',
    nextLabel: 'Manage Your Home',
    href: '/home/manage',
    matches: p => p === '/home/manage',
    anchor: 'manage',
    tip: 'Invite the people in your home and manage seats — up to three accounts, plus family profiles for anyone without one. You can also choose what Home features.',
    where: 'Manage Home, in the main navigation.',
  },
  {
    key: 'spaces',
    title: 'Create a Family Space',
    nextLabel: 'Family Spaces',
    href: '/spaces',
    // `/spaces` lands on the Tapestry. Show there while it is the empty
    // state or the walk led there, and always on the create wizard.
    matches: (p, { walking, noSpaces }) =>
      p === '/spaces/new' || (p === '/spaces/tapestry' && (noSpaces || walking === 'spaces')),
    anchor: 'spaces',
    tip: 'A Family Space gathers homes — your parents’, your siblings’, your cousins’ — around one shared tapestry. Create one, or wait for an invitation.',
    where: 'Family Spaces, at the end of the main navigation.',
  },
];

export const GET_STARTED_STEPS: GetStartedStep[] = STEPS.map((s, i) => ({ ...s, n: i + 1 }));

type Wizard = { active: boolean; steps: Partial<Record<string, boolean>> };
type Session = { walking: StepKey | null };

const NEW_WIZARD: Wizard = { active: true, steps: {} };
const EMPTY_SESSION: Session = { walking: null };
const SESSION_KEY = 'kinloom-get-started-session-v2';

/**
 * The API answers `steps: {}`, but PHP can encode an empty map as `[]`, and
 * an account from before the field existed has no `training_wizard` at all.
 * Both read as a new wizard.
 */
function normalize(w: TrainingWizard | null | undefined): Wizard {
  if (!w) return NEW_WIZARD;
  const steps = w.steps && typeof w.steps === 'object' && !Array.isArray(w.steps) ? w.steps : {};
  return { active: w.active !== false, steps };
}

// ─── The wizard, from the API ──────────────────────────────────────────────
//
// `base` is the `training_wizard` the auth user carried when this browser
// last changed something. While the auth user still carries that same
// object, what we changed since wins; once the user is refetched (a newer
// object), the server's copy wins, since it already includes our changes.

let mine: { personId: string; base: TrainingWizard | undefined; value: Wizard; confirmed: Wizard } | null = null;
/** Bumped by every change, so only the newest answer is applied. */
let seq = 0;
const normalized = new WeakMap<object, Wizard>();

function fromUser(user: AuthUser): Wizard {
  const w = user.training_wizard;
  if (!w) return NEW_WIZARD;
  let v = normalized.get(w);
  if (!v) { v = normalize(w); normalized.set(w, v); }
  return v;
}

function current(user: AuthUser): Wizard {
  if (mine && mine.personId === user.person_id && mine.base === user.training_wizard) return mine.value;
  return fromUser(user);
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab walking the steps.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/**
 * Shows `next` at once and sends `changes`. The server's answer replaces it,
 * unless a newer change is already on its way; a failure goes back to what
 * the server last confirmed.
 */
async function change(user: AuthUser, next: Wizard, changes: TrainingWizardChanges) {
  const confirmed = mine && mine.personId === user.person_id && mine.base === user.training_wizard
    ? mine.confirmed
    : fromUser(user);
  const base = user.training_wizard;
  mine = { personId: user.person_id, base, value: next, confirmed };
  notify();

  const id = ++seq;
  try {
    const saved = await patchSettings({ training_wizard: changes });
    const value = normalize(saved.training_wizard);
    if (mine?.base !== base) return; // the user was refetched meanwhile
    mine = { ...mine, confirmed: value, value: id === seq ? value : mine.value };
  } catch (err) {
    console.error('Saving Get started progress failed', err);
    if (mine?.base !== base || id !== seq) return;
    mine = { ...mine, value: mine.confirmed };
  }
  notify();
}

// ─── The walk, in this tab only ────────────────────────────────────────────

let sessionCache: { raw: string | null; value: Session } | null = null;

function readSession(): Session {
  let raw: string | null = null;
  try { raw = window.sessionStorage.getItem(SESSION_KEY); } catch { /* blocked storage */ }
  if (sessionCache && sessionCache.raw === raw) return sessionCache.value;
  let value = EMPTY_SESSION;
  if (raw) {
    try { value = { ...EMPTY_SESSION, ...JSON.parse(raw) }; } catch { /* corrupt: start over */ }
  }
  sessionCache = { raw, value };
  return value;
}

function writeSession(value: Session) {
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch { /* blocked storage */ }
  notify();
}

const noWizard = () => NEW_WIZARD;

/**
 * Progress through the steps, for the signed-in person. `ready` is false on
 * the server and the first client render, when the walk in sessionStorage
 * cannot be read yet: render nothing until then.
 */
export function useGetStarted(user: AuthUser | null) {
  const wizard = useSyncExternalStore(
    subscribe,
    user ? () => current(user) : noWizard,
    user ? () => fromUser(user) : noWizard,
  );
  const sess = useSyncExternalStore(subscribe, readSession, () => null);

  // Only `true` counts: a step sent back as `false` is not done.
  const done = GET_STARTED_STEPS.filter(s => wizard.steps[s.key] === true).map(s => s.key);

  /** The checklist row or the tip's Done box: one step on or off. */
  const setDone = useCallback((step: StepKey, isDone: boolean) => {
    if (!user) return;
    const w = current(user);
    change(user, { ...w, steps: { ...w.steps, [step]: isDone } }, { steps: { [step]: isDone } });
  }, [user]);

  /**
   * "Don't show again" (hidden = true), and Settings → Account, whose box
   * shows the same value. Showing it again starts the steps over: every
   * stored step is sent as `null`, which removes it.
   */
  const setHidden = useCallback((hidden: boolean) => {
    if (!user) return;
    const w = current(user);
    if (hidden) {
      change(user, { ...w, active: false }, { active: false });
      return;
    }
    const cleared = Object.fromEntries(Object.keys(w.steps).map(k => [k, null]));
    change(user, { active: true, steps: {} }, { active: true, steps: cleared });
    writeSession(EMPTY_SESSION);
  }, [user]);

  /** Opening a step from the checklist or Previous/Next. */
  const walkTo = useCallback((step: StepKey | null) => {
    writeSession({ walking: step });
  }, []);

  return {
    ready: !!user && sess !== null,
    done,
    hidden: !wizard.active,
    walking: sess?.walking ?? null,
    setDone,
    setHidden,
    walkTo,
  };
}
