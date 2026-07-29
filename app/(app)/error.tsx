'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[app error]', error);
    }
  }, [error]);

  return (
    <div className="error-page">
      <p className="eyebrow">Something interrupted us</p>
      <h1 className="error-page__title">This page couldn&rsquo;t finish loading.</h1>
      <p className="error-page__sub">
        The backend may have hiccuped. You can try again, or head back to your family home.
      </p>
      <div className="error-page__actions">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/home" className="btn-outline">Back to home</Link>
      </div>
      {error.digest && (
        <p className="error-page__digest">Reference: {error.digest}</p>
      )}
    </div>
  );
}
