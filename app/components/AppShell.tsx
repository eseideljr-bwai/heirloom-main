'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { getActiveFamilySpaceId } from '../../lib/auth';
import AppNav from './AppNav';

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#fdfcfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 56, width: 'auto', opacity: 0.35 }} />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      routerRef.current.replace('/');
      return;
    }
    // If onboarding hasn't created a family space yet, send the user there.
    if (!getActiveFamilySpaceId(user)) {
      routerRef.current.replace('/onboarding/profile');
    }
  }, [loading, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  if (!getActiveFamilySpaceId(user)) return <LoadingScreen />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdfcfa' }}>
      <AppNav user={user} />
      <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
