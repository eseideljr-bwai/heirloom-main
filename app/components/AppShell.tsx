'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Redirect only after auth is confirmed absent. routerRef avoids adding
  // router to deps, which would re-run this effect on every navigation.
  useEffect(() => {
    if (!loading && !user) {
      routerRef.current.replace('/');
    }
  }, [loading, user]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fdfcfa' }}>
      <AppNav user={user} />
      <main style={{ flex: 1, marginLeft: 240, minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
