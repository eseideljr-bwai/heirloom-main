'use client';

/**
 * Active family-space selection (Epic 2 + Epic 3).
 *
 * - Initial value is provided by the server root layout (which reads
 *   `kinloom_active_family_space` cookie). No localStorage required.
 * - Switching POSTs to `/api/active-space` to update the cookie and
 *   calls `router.refresh()` so every server component on the page
 *   re-renders with the new space's data.
 * - Cross-tab sync via BroadcastChannel so opening the switcher in
 *   another tab is reflected here.
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
import { parseFamilySpaces, type FamilySpaceRef } from './auth';
import { useAuth } from './auth-context';

type ActiveFamilySpaceContextValue = {
  spaces: FamilySpaceRef[];
  activeSpaceId: string | null;
  activeSpace: FamilySpaceRef | null;
  setActiveSpaceId: (ulid: string) => Promise<void>;
};

const Ctx = createContext<ActiveFamilySpaceContextValue | null>(null);

export type ActiveFamilySpaceProviderProps = {
  children: React.ReactNode;
  /** Resolved by the server layout from the active-space cookie. */
  initialActiveSpaceId?: string | null;
};

export function ActiveFamilySpaceProvider({
  children,
  initialActiveSpaceId = null,
}: ActiveFamilySpaceProviderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const spaces = useMemo(() => parseFamilySpaces(user?.family_spaces), [user]);

  const [activeSpaceId, setActiveSpaceIdState] = useState<string | null>(initialActiveSpaceId);

  // Reconcile against the latest spaces list.
  useEffect(() => {
    if (!user) {
      setActiveSpaceIdState(null);
      return;
    }
    const ids = new Set(spaces.map(s => s.ulid));
    if (activeSpaceId && ids.has(activeSpaceId)) return;
    const fallback = spaces[0]?.ulid ?? null;
    setActiveSpaceIdState(fallback);
  }, [user, spaces, activeSpaceId]);

  // Cross-tab sync.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('kinloom_active_space');
    bc.onmessage = (e) => {
      if (typeof e.data === 'string') {
        setActiveSpaceIdState(e.data || null);
        router.refresh();
      }
    };
    return () => bc.close();
  }, [router]);

  const setActiveSpaceId = useCallback(async (ulid: string) => {
    setActiveSpaceIdState(ulid);
    const res = await fetch('/api/active-space', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ ulid }),
    });
    if (!res.ok) {
      // Revert if server rejected. Most common cause is "not a member".
      const fallback = spaces[0]?.ulid ?? null;
      setActiveSpaceIdState(fallback);
      return;
    }
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('kinloom_active_space');
        bc.postMessage(ulid);
        bc.close();
      } catch {
        // ignore
      }
    }
    // Re-render every server component on the page with the new space.
    router.refresh();
  }, [spaces, router]);

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
