'use client';

/**
 * Auth/onboarding gate for the (app) route group.
 *
 * Epic 2 AC: "Protected pages never render a loading state."
 *   • The (app) server layout verifies the session and the onboarding state
 *     before this renders, so by the time it mounts the request is
 *     authenticated and the person has finished the profile step. The checks
 *     below are UX, not a security boundary — they run in the browser, long
 *     after the payload has been sent.
 *   • AuthProvider hydrates `user` from the server layout on first paint.
 *   • While auth is still settling we render nothing (not a splash). Once
 *     settled we either show the shell or hard-redirect.
 *   • Readiness is `onboarding_state`, never "has a Family Space": a person
 *     with no Space is normal (Phase 3 contract §3.1).
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { postToNative } from '../../lib/embed';
import { useEmbedded } from '../../lib/embed-context';
import AppNav from './AppNav';
import AppFooter from './AppFooter';
import { FeedbackProvider } from './feedback/FeedbackContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const embedded = useEmbedded();
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  const needsOnboarding = user?.onboarding_state === 'profile_pending';

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      if (postToNative({ type: 'sessionExpired' })) return;
      routerRef.current.replace('/?reason=session_expired');
      return;
    }
    if (!needsOnboarding) return;
    // Onboarding is a native screen in the iOS app.
    if (postToNative({ type: 'requestClose' })) return;
    routerRef.current.replace('/onboarding/profile');
  }, [authReady, user, needsOnboarding]);

  if (!authReady) return null;
  if (!user) return null;
  if (needsOnboarding) return null;

  return (
    // FeedbackProvider sits inside the auth gate, so the feedback tool exists
    // only on authenticated routes. With its flag off it renders children and
    // nothing else.
    <FeedbackProvider>
      <div className={embedded ? 'app-shell app-shell--embedded' : 'app-shell'}>
        {!embedded && <AppNav user={user} />}
        <main className="app-shell__main">{children}</main>
        {/* The native app supplies its own chrome, footer included. */}
        {!embedded && <AppFooter />}
      </div>
    </FeedbackProvider>
  );
}
