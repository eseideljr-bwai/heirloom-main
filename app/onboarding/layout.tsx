'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import Link from 'next/link';

const STEPS = [
  { label: 'Welcome',       href: '/onboarding' },
  { label: 'Your Profile',  href: '/onboarding/profile' },
  { label: 'First Kinloom', href: '/onboarding/first-kinloom' },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: '#fdfcfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 56, width: 'auto', opacity: 0.35 }} />
      </div>
    );
  }

  const currentStep = STEPS.findIndex(s => s.href === pathname);

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcfa' }}>
      {/* Header bar */}
      <header style={{ borderBottom: '1px solid #d4d2cc', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdfcfa' }}>
        <Link href="/home" style={{ display: 'block', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 48, width: 'auto' }} />
        </Link>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((step, i) => (
            <div key={step.href} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 9999,
                  background: i < currentStep ? '#556b5b' : i === currentStep ? '#556b5b' : '#e8e6e1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: 14,
                  color: i <= currentStep ? '#fdfcfa' : '#6b6b6b',
                }}>
                  {i < currentStep ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (i + 1)}
                </div>
                <span style={{ fontSize: 13, color: i === currentStep ? '#556b5b' : 'rgba(26,26,26,0.45)', fontWeight: i === currentStep ? 500 : 400 }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 32, height: 1, background: i < currentStep ? '#556b5b' : '#d4d2cc', margin: '0 12px' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ width: 120 }} />
      </header>

      {children}
    </div>
  );
}
