import Link from 'next/link';

export default function RootNotFound() {
  return (
    <div className="error-page">
      <p className="eyebrow">Lost</p>
      <h1 className="error-page__title">This page doesn&rsquo;t exist.</h1>
      <p className="error-page__sub">Check the URL, or head home.</p>
      <div className="error-page__actions">
        <Link href="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );
}
