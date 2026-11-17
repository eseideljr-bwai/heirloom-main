'use client';

import Link from 'next/link';

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <p className="eyebrow">Onboarding paused</p>
      <h1 className="error-page__title">We hit a snag getting you set up.</h1>
      <p className="error-page__sub">Try again, or sign out and start fresh.</p>
      <div className="error-page__actions">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-outline">Back to sign-in</Link>
      </div>
      {error.digest && <p className="error-page__digest">Reference: {error.digest}</p>}
    </div>
  );
}
