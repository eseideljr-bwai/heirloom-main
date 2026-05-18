'use client';

/**
 * Auth/onboarding gate for the (app) route group.
 *
 * Epic 2 AC: "Protected pages never render a loading state."
 *   • Middleware already bounced unauthenticated visitors at the edge, so
 *     by the time this component mounts there's a session cookie.
 *   • AuthProvider hydrates `user` synchronously from a localStorage
 *     cache on repeat visits → we can render the real shell immediately,
 *     no centered-logo splash.
 *   • The only case where `user` is null but we got past middleware is
 *     a brand-new tab where the user just signed in (no cache yet) —
 *     we render `null` (blank, not a splash) for the few ms until /me
 *     resolves. Effectively invisible.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useActiveFamilySpace } from '../../lib/active-family-space';
import AppNav from './AppNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { activeSpaceId, spaces } = useActiveFamilySpace();
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Session expired or token revoked while the tab was open.
      routerRef.current.replace('/?reason=session_expired');
      return;
    }
    if (spaces.length === 0) {
      // No family space yet → finish onboarding.
      routerRef.current.replace('/onboarding/profile');
    }
  }, [loading, user, spaces]);

  if (!user) return null;
  if (spaces.length === 0) return null;
  // Active space hasn't been picked yet (first render between user and
  // provider reconciliation) — render nothing for one frame.
  if (!activeSpaceId) return null;

  return (
    <div className="app-shell">
      <AppNav user={user} />
      <main className="app-shell__main">{children}</main>
    </div>
  );
}
