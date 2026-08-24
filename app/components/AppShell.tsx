'use client';

/**
 * Auth/onboarding gate for the (app) route group.
 *
 * Epic 2 AC: "Protected pages never render a loading state."
 *   • Middleware already bounced unauthenticated visitors at the edge, so
 *     by the time this component mounts there's a session cookie.
 *   • AuthProvider hydrates `user` from the server layout on first paint.
 *   • While auth is still settling we render nothing (not a splash). Once
 *     settled we either show the shell or hard-redirect — never sit on a
 *     permanent blank page because `activeSpaceId` lagged behind `spaces`.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useActiveFamilySpace } from '../../lib/active-family-space';
import AppNav from './AppNav';
import { FeedbackProvider } from './feedback/FeedbackContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authReady, provisional } = useAuth();
  const { activeSpaceId, spaces } = useActiveFamilySpace();
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      routerRef.current.replace('/?reason=session_expired');
      return;
    }
    if (spaces.length > 0) return;

    // Reaching here means the server let this page render, which it only
    // does once `requireActiveSpaceId` found a space — so empty `spaces` is
    // client state disagreeing with the server. On a provisional user it's
    // a placeholder from an unread /me, and redirecting to onboarding on the
    // strength of it is what put finished users back on step 2. Ask the
    // server once instead; it owns this decision.
    if (provisional) {
      if (refreshedRef.current) return;
      refreshedRef.current = true;
      routerRef.current.refresh();
      return;
    }
    routerRef.current.replace('/onboarding/profile');
  }, [authReady, user, spaces, provisional]);

  if (!authReady) return null;
  if (!user) return null;
  if (spaces.length === 0) return null;

  // activeSpaceId is resolved synchronously from spaces in the provider.
  // If it's somehow still missing, fall back rather than blanking forever.
  const spaceId = activeSpaceId ?? spaces[0]?.ulid ?? null;
  if (!spaceId) return null;

  return (
    // FeedbackProvider sits inside the auth gate, so the feedback tool exists
    // only on authenticated routes. With its flag off it renders children and
    // nothing else.
    <FeedbackProvider>
      <div className="app-shell">
        <AppNav user={user} />
        <main className="app-shell__main">{children}</main>
      </div>
    </FeedbackProvider>
  );
}
