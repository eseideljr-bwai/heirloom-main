/**
 * Shown in place of the app for a memorialized account (CO-1 C2). The API
 * answers every route but /me with 403 `account_memorialized`, so there is
 * nothing else to render. Server component: no client state needed.
 */
export default function MemorializedNotice() {
  return (
    <div className="stub-page">
      <h1 className="stub-page__title">This account has been memorialized.</h1>
      <p className="stub-page__blurb">
        The kinlooms shared here are kept for the people they were written for. This account can
        no longer be signed in to or changed.
      </p>
    </div>
  );
}
