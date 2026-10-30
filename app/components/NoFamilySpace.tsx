import Link from 'next/link';

/**
 * Shown on every `/spaces/*` screen when the person's Family Home is in no
 * Family Space. A Home is always there; a Space is optional, so this is a
 * normal state and not an error.
 */
export default function NoFamilySpace({ what }: { what: string }) {
  return (
    <div className="mg-page">
      <p className="eyebrow">Family Space</p>
      <h1 className="mg-page__title">Your Family Home isn’t in a Family Space yet.</h1>
      <div className="empty-card">
        <p className="empty-card__text">
          A Family Space joins several Family Homes together. Once your home is in one,
          {' '}{what} appears here.
        </p>
        <Link href="/home" className="empty-card__cta">Back to your home →</Link>
      </div>
    </div>
  );
}
