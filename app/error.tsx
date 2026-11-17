'use client';

/**
 * Root-level error boundary. Catches anything not caught by a deeper
 * boundary (e.g. errors raised by the root layout itself).
 */
import { useEffect } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[root error]', error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="error-page error-page--root">
          <h1 className="error-page__title">Something went wrong.</h1>
          <p className="error-page__sub">Please refresh the page or try again in a moment.</p>
          <div className="error-page__actions">
            <button type="button" onClick={reset} className="btn-primary">Try again</button>
          </div>
          {error.digest && <p className="error-page__digest">Reference: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
