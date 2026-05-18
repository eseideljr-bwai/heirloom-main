/**
 * Streaming fallback shown while a server component on a protected
 * route is still resolving its data. Intentionally minimal — most
 * routes resolve fast enough that this is never visible.
 */
export default function AppLoading() {
  return (
    <div className="app-loading" aria-busy="true">
      <div className="app-loading__dot" />
      <div className="app-loading__dot" />
      <div className="app-loading__dot" />
      <span className="app-loading__label">Loading\u2026</span>
    </div>
  );
}
