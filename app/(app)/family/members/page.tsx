import Link from 'next/link';

export default function FamilyMembersPage() {
  return (
    <div style={{ padding: '48px' }}>

      <Link href="/family" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none', marginBottom: 32 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Family
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 12px' }}>Members</p>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 42, lineHeight: 1.15, margin: 0, color: '#1a1a1a' }}>Manage your family space.</h1>
        </div>
        <button style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          + Invite member
        </button>
      </div>

      <div style={{ background: 'rgba(245,244,241,0.40)', border: '1px solid #d4d2cc', borderRadius: 12, padding: '64px 48px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: '0 0 8px' }}>
          No family members yet.
        </p>
        <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.5)', margin: '0 0 28px' }}>
          Your family space is invite-only. Invite the people you want to include.
        </p>
        <button style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
          Send an invitation
        </button>
      </div>

    </div>
  );
}
