import Link from 'next/link';

export default function AppNotFound() {
  return (
    <div className="error-page">
      <p className="eyebrow">Not found</p>
      <h1 className="error-page__title">We couldn&rsquo;t find that here.</h1>
      <p className="error-page__sub">It may have been moved, removed, or never existed.</p>
      <div className="error-page__actions">
        <Link href="/home" className="btn-primary">Back to home</Link>
        <Link href="/library" className="btn-outline">Open library</Link>
      </div>
    </div>
  );
}
