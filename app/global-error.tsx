'use client';

/**
 * Global error boundary. Catches errors that escape the root layout
 * itself (rare). Required by App Router; also tells Next.js it
 * doesn't need to fall back to the Pages-Router default 500.tsx
 * during build, which would otherwise pull in `<Html>` from
 * next/document and break static-export of 404/500.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error('[global error]', error);
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
