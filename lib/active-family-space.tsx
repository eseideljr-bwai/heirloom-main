'use client';

/**
 * The person's Family Home and the Family Space they are looking at.
 *
 * - The Home is always present: it comes straight from `/me` (one Home per
 *   person, Phase 3 contract §2.1).
 * - Family Spaces are the ones that Home is active in. There may be none,
 *   and nothing here assumes otherwise.
 * - The selected Space is a preference. The server layout resolves it from
 *   the `kinloom_active_family_space` cookie (checked against `/me`), and
 *   switching POSTs to `/api/active-space` then `router.refresh()`es so
 *   every server component re-renders for the new Space. Other tabs follow
 *   through a BroadcastChannel.
 *
 * Names starting `activeSpace`/`spaces` below are the pre-Phase-3 API that
 * screens not yet rewired still read. They describe the Home, because the
 * Home is the container those screens meant. New code uses `home`,
 * `familySpaces` and `activeFamilySpace`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { homeAsLegacyRef, type FamilySpaceRef, type HomeSummary, type SpaceSummary } from './auth';
import { useAuth } from './auth-context';

type ActiveFamilySpaceContextValue = {
  /** The person's Family Home, or null while signed out. */
  home: HomeSummary | null;
  /** Family Spaces the Home is active in. Often empty. */
  familySpaces: SpaceSummary[];
  /** The Space in view, or null when the Home is in none. */
  activeFamilySpace: SpaceSummary | null;
  setActiveFamilySpaceId: (id: string) => Promise<void>;

  /** @deprecated The Home as a one-item list. Use `home` / `familySpaces`. */
  spaces: FamilySpaceRef[];
  /** @deprecated The Home id. Use `home?.id`. */
  activeSpaceId: string | null;
  /** @deprecated The Home. Use `home`. */
  activeSpace: FamilySpaceRef | null;
};

const Ctx = createContext<ActiveFamilySpaceContextValue | null>(null);

export type ActiveFamilySpaceProviderProps = {
  children: React.ReactNode;
  /** Resolved by the server layout from the active-space cookie. */
  initialActiveFamilySpaceId?: string | null;
};

function resolveFamilySpaceId(spaces: SpaceSummary[], preferred: string | null): string | null {
  if (spaces.length === 0) return null;
  if (preferred && spaces.some(s => s.id === preferred)) return preferred;
  return spaces[0].id;
}

export function ActiveFamilySpaceProvider({
  children,
  initialActiveFamilySpaceId = null,
}: ActiveFamilySpaceProviderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const home = user?.home ?? null;
  const familySpaces = useMemo(() => user?.spaces ?? [], [user]);

  const [preferredId, setPreferredId] = useState<string | null>(initialActiveFamilySpaceId);

  // Resolved during render so consumers never see a one-frame null while
  // the Spaces are already known.
  const activeFamilySpaceId = useMemo(
    () => (user ? resolveFamilySpaceId(familySpaces, preferredId) : null),
    [user, familySpaces, preferredId],
  );

  // Keep the preference in step with what resolved (e.g. the cookie named a
  // Space the Home has since left).
  useEffect(() => {
    if (!user) {
      if (preferredId != null) setPreferredId(null);
      return;
    }
    if (activeFamilySpaceId && activeFamilySpaceId !== preferredId) {
      setPreferredId(activeFamilySpaceId);
    }
  }, [user, activeFamilySpaceId, preferredId]);

  // Cross-tab sync.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('kinloom_active_space');
    bc.onmessage = (e) => {
      if (typeof e.data === 'string') {
        setPreferredId(e.data || null);
        router.refresh();
      }
    };
    return () => bc.close();
  }, [router]);

  const setActiveFamilySpaceId = useCallback(async (id: string) => {
    setPreferredId(id);
    const res = await fetch('/api/active-space', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      // Revert if the server rejected it (the Home isn't in that Space).
      setPreferredId(familySpaces[0]?.id ?? null);
      return;
    }
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('kinloom_active_space');
        bc.postMessage(id);
        bc.close();
      } catch {
        // ignore
      }
    }
    // Re-render every server component on the page for the new Space.
    router.refresh();
  }, [familySpaces, router]);

  const activeFamilySpace = useMemo(
    () => familySpaces.find(s => s.id === activeFamilySpaceId) ?? null,
    [familySpaces, activeFamilySpaceId],
  );

  const legacyHome = useMemo(() => (user ? homeAsLegacyRef(user) : null), [user]);
  const legacySpaces = useMemo(() => (legacyHome ? [legacyHome] : []), [legacyHome]);

  const value = useMemo<ActiveFamilySpaceContextValue>(
    () => ({
      home,
      familySpaces,
      activeFamilySpace,
      setActiveFamilySpaceId,
      spaces: legacySpaces,
      activeSpaceId: legacyHome?.ulid ?? null,
      activeSpace: legacyHome,
    }),
    [home, familySpaces, activeFamilySpace, setActiveFamilySpaceId, legacySpaces, legacyHome],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveFamilySpace(): ActiveFamilySpaceContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useActiveFamilySpace must be used inside <ActiveFamilySpaceProvider>');
  }
  return v;
}
