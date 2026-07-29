import Link from 'next/link';

export default function OnboardingWelcome() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 32px', textAlign: 'center', marginTop: 40 }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
        Your story begins here
      </p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 56, lineHeight: 1.05, margin: '0 0 24px', color: '#1a1a1a', letterSpacing: '-0.01em' }}>
        Welcome to Kinloom.
      </h1>
      <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: '0 0 12px' }}>
        A quiet, private space to keep what matters — the stories, lessons, and small everyday things you&apos;d want your family to remember.
      </p>
      <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.5)', margin: '0 0 40px', fontStyle: 'italic' }}>
        Just for you and the people you choose. No likes. No feeds.
      </p>

      <div style={{ width: 200, height: 90, margin: '0 auto 40px' }}>
        <svg viewBox="0 0 200 90" width="200" height="90" aria-hidden="true">
          <path d="M 20 15 Q 60 45, 100 45 Q 140 45, 180 75"
            fill="none" stroke="#a39376" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <path d="M 20 45 Q 60 45, 100 45 Q 140 45, 180 45"
            fill="none" stroke="#556b5b" strokeWidth="1.5" opacity="0.85" strokeLinecap="round" />
          <path d="M 20 75 Q 60 45, 100 45 Q 140 45, 180 15"
            fill="none" stroke="#b08d7e" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <circle cx="100" cy="45" r="3" fill="#556b5b" />
        </svg>
      </div>

      <Link href="/onboarding/profile"
        style={{ display: 'inline-block', background: '#556b5b', color: '#fdfcfa', padding: '14px 40px', borderRadius: 8, fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
        Begin
      </Link>
      <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.45)', margin: '16px 0 0' }}>
        <Link href="/home" style={{ color: 'rgba(26,26,26,0.45)', textDecoration: 'none' }}>Skip for now →</Link>
      </p>
    </div>
  );
}
