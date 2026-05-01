import Link from 'next/link';

export default function MemberProfilePage({ params }: { params: { memberId: string } }) {
  return (
    <div style={{ padding: '48px' }}>

      <Link href="/family" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none', marginBottom: 32 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Family
      </Link>

      {/* Member header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
        <div style={{ width: 72, height: 72, borderRadius: 9999, background: '#e8e6e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontFamily: 'var(--font-serif)', color: 'rgba(26,26,26,0.4)', flexShrink: 0 }}>
          ?
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.2, margin: '0 0 4px', color: '#1a1a1a' }}>
            Family member
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.5)', margin: 0 }}>ID: {params.memberId}</p>
        </div>
        <Link href={`/legacy-bank/${params.memberId}`} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(85,107,91,0.10)', color: '#556b5b', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
          AI Legacy Bank
        </Link>
      </div>

      {/* Their kinlooms */}
      <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: '0 0 24px', color: '#1a1a1a' }}>
        Their kinlooms
      </h2>
      <div style={{ background: 'rgba(245,244,241,0.40)', border: '1px solid #d4d2cc', borderRadius: 12, padding: '64px 48px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'rgba(26,26,26,0.4)', margin: 0 }}>
          No kinlooms shared yet.
        </p>
      </div>

    </div>
  );
}
