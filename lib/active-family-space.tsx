'use client';

/**
 * Active family-space selection (Epic 2 AC: "A user belonging to multiple
 * family spaces can switch without re-authenticating").
 *
 * - Persists the selected space ulid in localStorage so reloads stay sticky.
 * - Falls back to the first space in `user.family_spaces` when nothing is
 *   stored, or when the stored id is no longer a member of `user.family_spaces`
 *   (e.g. removed from the space in another tab).
 * - Exposing this as a context (instead of `getActiveFamilySpaceId(user)`
 *   ad-hoc) means switching spaces re-renders every consumer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { parseFamilySpaces, type FamilySpaceRef } from './auth';
import { useAuth } from './auth-context';

const ACTIVE_SPACE_KEY = 'heirloom.active_family_space';

type ActiveFamilySpaceContextValue = {
  spaces: FamilySpaceRef[];
  activeSpaceId: string | null;
  activeSpace: FamilySpaceRef | null;
  setActiveSpaceId: (ulid: string) => void;
};

const Ctx = createContext<ActiveFamilySpaceContextValue | null>(null);

function readStored(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_SPACE_KEY);
}

function writeStored(ulid: string | null) {
  if (typeof window === 'undefined') return;
  if (ulid) window.localStorage.setItem(ACTIVE_SPACE_KEY, ulid);
  else window.localStorage.removeItem(ACTIVE_SPACE_KEY);
}

export function ActiveFamilySpaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const spaces = useMemo(() => parseFamilySpaces(user?.family_spaces), [user]);

  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(() => {
    const stored = readStored();
    if (stored) return stored;
    return null;
  });

  // Reconcile against the latest `spaces` list. Runs when:
  //   • user logs in / out
  //   • their family_spaces list changes (joined/left a space)
  useEffect(() => {
    if (!user) {
      setActiveSpaceIdState(null);
      return;
    }
    const stored = readStored();
    const ids = new Set(spaces.map(s => s.ulid));
    if (stored && ids.has(stored)) {
      setActiveSpaceIdState(stored);
      return;
    }
    // Fall back to the first space.
    const fallback = spaces[0]?.ulid ?? null;
    if (fallback) writeStored(fallback);
    else writeStored(null);
    setActiveSpaceIdState(fallback);
  }, [user, spaces]);

  // Cross-tab sync: if the user picks a different space in another tab,
  // pick it up here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ACTIVE_SPACE_KEY) return;
      setActiveSpaceIdState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setActiveSpaceId = useCallback((ulid: string) => {
    writeStored(ulid);
    setActiveSpaceIdState(ulid);
  }, []);

  const activeSpace = useMemo(
    () => spaces.find(s => s.ulid === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  return (
    <Ctx.Provider value={{ spaces, activeSpaceId, activeSpace, setActiveSpaceId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveFamilySpace(): ActiveFamilySpaceContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useActiveFamilySpace must be used inside <ActiveFamilySpaceProvider>');
  }
  return v;
}
