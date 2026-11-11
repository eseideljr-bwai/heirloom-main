'use client';

/**
 * Get started on Kinloom: eight steps, each opening the page it describes
 * with a short tip anchored to where that page lives in the navigation.
 *
 * Nothing on the API records this yet, so progress is kept in this browser,
 * per person:
 *
 *   localStorage   which steps are checked off (by step key, so reordering
 *                  the steps never scrambles them), and "Don't show again"
 *   sessionStorage the step the person is walking through from the
 *                  checklist or Previous/Next
 *
 * A tip shows on its step's page until that step is checked off, here or in
 * the tip's Done box: the two are the same state. × closes it on the page
 * you are on and nothing more: it is back the next time you open that page
 * (GetStartedTip keeps that, not storage). "Don't show again" hides the
 * checklist and every tip. Settings → Account shows the same flag as
 * "Onboarding complete".
 *
 * TODO: the API is getting its own field for this (not `onboarding_state`,
 * which only tracks the sign-up profile step). Move `done` and `hidden`
 * there once it lands so they follow the person across devices.
 */

import { useCallback, useSyncExternalStore } from 'react';

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

type Progress = { done: StepKey[]; hidden: boolean };
type Session = { walking: StepKey | null };

const EMPTY_PROGRESS: Progress = { done: [], hidden: false };
const EMPTY_SESSION: Session = { walking: null };

const progressKey = (personId: string) => `kinloom-get-started-v2:${personId}`;
const SESSION_KEY = 'kinloom-get-started-session-v2';

/**
 * v1 saved steps by number, in the old order (Home was step 5, "Review your
 * Family Home"). Carried over once, then v1 is removed.
 */
const LEGACY_PROGRESS_KEY = (personId: string) => `kinloom-get-started-v1:${personId}`;
const V1_ORDER: StepKey[] = ['create', 'vault', 'portrait', 'bank', 'home', 'library', 'manage', 'spaces'];

function migrateV1(personId: string) {
  try {
    const store = window.localStorage;
    const old = store.getItem(LEGACY_PROGRESS_KEY(personId));
    if (old === null) return;
    store.removeItem(LEGACY_PROGRESS_KEY(personId));
    if (store.getItem(progressKey(personId)) !== null) return;
    const v1 = JSON.parse(old) as { done?: number[]; hidden?: boolean };
    const done = (v1.done ?? []).map(n => V1_ORDER[n - 1]).filter(Boolean);
    store.setItem(progressKey(personId), JSON.stringify({ done, hidden: v1.hidden === true }));
  } catch { /* blocked or corrupt storage: start over */ }
}

// useSyncExternalStore needs a stable snapshot, so parsed values are cached
// against the raw string they came from.
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(storage: () => Storage, key: string, fallback: T): T {
  let raw: string | null = null;
  try { raw = storage().getItem(key); } catch { /* blocked storage */ }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = fallback;
  if (raw) {
    try { value = { ...fallback, ...JSON.parse(raw) }; } catch { /* corrupt: start over */ }
  }
  cache.set(key, { raw, value });
  return value;
}

const listeners = new Set<() => void>();

function write(storage: () => Storage, key: string, value: unknown) {
  try { storage().setItem(key, JSON.stringify(value)); } catch { /* blocked storage: lasts this render only */ }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab checking a step off.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/**
 * Progress through the steps. `ready` is false on the server and the first
 * client render, when storage cannot be read: render nothing until then.
 */
export function useGetStarted(personId: string) {
  const key = progressKey(personId);
  // Migrating writes storage without notifying anyone: it is idempotent,
  // and the read right after it already sees the result.
  const progress = useSyncExternalStore(subscribe, () => {
    if (personId) migrateV1(personId);
    return read(local, key, EMPTY_PROGRESS);
  }, () => null);
  const sess = useSyncExternalStore(subscribe, () => read(session, SESSION_KEY, EMPTY_SESSION), () => null);

  const setDone = useCallback((step: StepKey, done: boolean) => {
    const p = read(local, key, EMPTY_PROGRESS);
    const next = done ? Array.from(new Set([...p.done, step])) : p.done.filter(x => x !== step);
    write(local, key, { ...p, done: next });
  }, [key]);

  const setHidden = useCallback((hidden: boolean) => {
    write(local, key, { ...read(local, key, EMPTY_PROGRESS), hidden });
  }, [key]);

  /**
   * "Onboarding complete" in Settings. Checking it hides the checklist and
   * every tip; unchecking starts the steps over from nothing.
   */
  const setComplete = useCallback((complete: boolean) => {
    if (complete) {
      write(local, key, { ...read(local, key, EMPTY_PROGRESS), hidden: true });
    } else {
      write(local, key, EMPTY_PROGRESS);
      write(session, SESSION_KEY, EMPTY_SESSION);
    }
  }, [key]);

  /** Opening a step from the checklist or Previous/Next. */
  const walkTo = useCallback((step: StepKey | null) => {
    write(session, SESSION_KEY, { walking: step });
  }, []);

  return {
    ready: progress !== null && sess !== null,
    done: progress?.done ?? [],
    hidden: progress?.hidden ?? false,
    /** Hidden, or every step checked off. */
    complete: !!progress && (progress.hidden || GET_STARTED_STEPS.every(s => progress.done.includes(s.key))),
    walking: sess?.walking ?? null,
    setDone,
    setHidden,
    setComplete,
    walkTo,
  };
}
