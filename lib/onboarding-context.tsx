'use client';

/**
 * Client-side owner of the onboarding flags. Initialised from the cookie
 * the (app) layout read on the server, so the first paint already knows
 * whether the checklist is hidden — no flash. Every write goes to both
 * React state and the cookie.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth-context';
import {
  mergeOnboardingFlags,
  writeOnboardingFlags,
  type LocalTaskKey,
  type OnboardingFlags,
} from './onboarding';

type OnboardingContextValue = {
  flags: OnboardingFlags;
  update: (patch: Partial<OnboardingFlags>) => void;
  markTask: (task: LocalTaskKey) => void;
  setChecklistHidden: (hidden: boolean) => void;
  setProgressDone: (done: number) => void;
};

const OnboardingContext = createContext<OnboardingContextValue>({
  flags: {},
  update: () => {},
  markTask: () => {},
  setChecklistHidden: () => {},
  setProgressDone: () => {},
});

export function useOnboarding(): OnboardingContextValue {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({
  initialFlags,
  children,
}: {
  initialFlags: OnboardingFlags;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const userUlid = user?.ulid ?? null;
  const [flags, setFlags] = useState<OnboardingFlags>(initialFlags);

  const update = useCallback((patch: Partial<OnboardingFlags>) => {
    setFlags(prev => {
      const next = mergeOnboardingFlags(prev, patch);
      if (userUlid) writeOnboardingFlags(userUlid, next);
      return next;
    });
  }, [userUlid]);

  const markTask = useCallback((task: LocalTaskKey) => {
    setFlags(prev => {
      if (prev.tasks?.[task]) return prev;
      const next = mergeOnboardingFlags(prev, { tasks: { [task]: true } });
      if (userUlid) writeOnboardingFlags(userUlid, next);
      return next;
    });
  }, [userUlid]);

  const setChecklistHidden = useCallback(
    (hidden: boolean) => update({ checklistHidden: hidden }),
    [update],
  );

  const setProgressDone = useCallback((done: number) => {
    setFlags(prev => {
      if (prev.progressDone === done) return prev;
      const next = mergeOnboardingFlags(prev, { progressDone: done });
      if (userUlid) writeOnboardingFlags(userUlid, next);
      return next;
    });
  }, [userUlid]);

  const value = useMemo<OnboardingContextValue>(
    () => ({ flags, update, markTask, setChecklistHidden, setProgressDone }),
    [flags, update, markTask, setChecklistHidden, setProgressDone],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

/**
 * Drop-in for pages that count as completing a checklist item just by being
 * visited (Talk, Import, Legacy Bank). Renders nothing.
 */
export function MarkOnboardingTask({ task }: { task: LocalTaskKey }) {
  const { markTask } = useOnboarding();
  useEffect(() => { markTask(task); }, [markTask, task]);
  return null;
}
