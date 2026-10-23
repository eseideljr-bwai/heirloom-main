/**
 * Onboarding flags — splash seen, checklist hidden, contextual hints, and
 * the checklist items that have no server-side signal (Talk/Import tried,
 * Legacy Bank visited, feedback sent).
 *
 * Stored in a single non-HttpOnly cookie, keyed by user ulid so two accounts
 * on one browser don't share state. Server components read it (no flash on
 * /home); client components write it. Nothing here is a security boundary —
 * it only decides which onboarding chrome to show.
 */

export const ONBOARDING_COOKIE_PREFIX = 'kinloom_onb_';
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Checklist items tracked purely client-side. */
export type LocalTaskKey = 'agent' | 'legacy' | 'feedback';

export type OnboardingFlags = {
  /** The "Welcome to Kinloom" splash has been shown. */
  welcomeSeen?: boolean;
  /** "Hide for now" on the home checklist. */
  checklistHidden?: boolean;
  /** The 3-step contextual hint walkthrough was finished or dismissed. */
  hintsDone?: boolean;
  /** Current step of the walkthrough (0-2). */
  hintIndex?: number;
  /** Locally-tracked checklist completions. */
  tasks?: Partial<Record<LocalTaskKey, boolean>>;
  /** Last computed "N of TOTAL complete", so the sidebar can show it off-home. */
  progressDone?: number;
};

export const ONBOARDING_TASK_TOTAL = 6;

export function onboardingCookieName(userUlid: string): string {
  return `${ONBOARDING_COOKIE_PREFIX}${userUlid}`;
}

export function parseOnboardingFlags(raw: string | null | undefined): OnboardingFlags {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as OnboardingFlags;
  } catch {
    return {};
  }
}

export function serializeOnboardingFlags(flags: OnboardingFlags): string {
  return encodeURIComponent(JSON.stringify(flags));
}

// ─── Browser side ─────────────────────────────────────────────────────

function isBrowser() {
  return typeof document !== 'undefined';
}

export function readOnboardingFlags(userUlid: string): OnboardingFlags {
  if (!isBrowser()) return {};
  const name = onboardingCookieName(userUlid);
  const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  return parseOnboardingFlags(match ? match.slice(name.length + 1) : null);
}

export function writeOnboardingFlags(userUlid: string, flags: OnboardingFlags): void {
  if (!isBrowser()) return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${onboardingCookieName(userUlid)}=${serializeOnboardingFlags(flags)}` +
    `; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax${secure}`;
}

export function mergeOnboardingFlags(
  current: OnboardingFlags,
  patch: Partial<OnboardingFlags>,
): OnboardingFlags {
  return {
    ...current,
    ...patch,
    tasks: patch.tasks ? { ...(current.tasks ?? {}), ...patch.tasks } : current.tasks,
  };
}
