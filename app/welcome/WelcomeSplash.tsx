'use client';

import { useEffect } from 'react';
import {
  mergeOnboardingFlags,
  readOnboardingFlags,
  writeOnboardingFlags,
} from '../../lib/onboarding';

export default function WelcomeSplash({ userUlid }: { userUlid: string }) {
  // Mark the splash as seen as soon as it renders, so a refresh or a back
  // button can never trap someone in a /home → /welcome loop.
  useEffect(() => {
    const current = readOnboardingFlags(userUlid);
    if (!current.welcomeSeen) {
      writeOnboardingFlags(userUlid, mergeOnboardingFlags(current, { welcomeSeen: true }));
    }
  }, [userUlid]);

  // Hard navigations on purpose: /home is a server component that reads the
  // cookie we just wrote, and the client router cache may still hold the
  // redirect-to-/welcome payload from a moment ago.
  const go = (href: string) => () => {
    window.location.assign(href);
  };

  return (
    <div className="welcome-splash">
      <div className="welcome-splash__inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-kinloom.png" alt="Kinloom" className="welcome-splash__logo" />
        <h1 className="welcome-splash__title">Welcome to Kinloom</h1>
        <p className="welcome-splash__lede">
          This is a private place for your family&apos;s stories, wisdom, and memories.
          Let&apos;s begin with something worth carrying forward.
        </p>
        <div className="welcome-splash__actions">
          <button type="button" className="welcome-splash__primary" onClick={go('/create/start')}>
            Create Your First Kinloom
          </button>
          <button type="button" className="welcome-splash__secondary" onClick={go('/home')}>
            Explore on My Own
          </button>
        </div>
      </div>
    </div>
  );
}
