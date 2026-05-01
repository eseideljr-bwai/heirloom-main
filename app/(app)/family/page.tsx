import Link from 'next/link';
import { MEMBERS, KINLOOMS, type Member } from '../../lib/mock-data';

function Silhouette({ member, size = 40 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376', isMe } = member;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-fam-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-fam-${member.id})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
      {isMe && <circle cx="40" cy="40" r="38" fill="none" stroke="#556b5b" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.9" />}
    </svg>
  );
}

const genLabels: Record<number, string> = { 1: 'Grandparents', 2: 'Parents & Aunt', 3: 'You & Siblings', 4: 'Children' };

export default function FamilyPage() {
  const byGen: Record<number, Member[]> = {};
  for (const m of MEMBERS) {
    if (!byGen[m.gen]) byGen[m.gen] = [];
    byGen[m.gen].push(m);
  }

  const kinloomsByAuthor: Record<string, number> = {};
  for (const k of KINLOOMS) {
    kinloomsByAuthor[k.author] = (kinloomsByAuthor[k.author] || 0) + 1;
  }

  return (
    <div style={{ padding: '48px' }}>

      <div style={{ marginBottom: 48 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Family</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, lineHeight: 1.1, margin: '0 0 16px', color: '#1a1a1a' }}>
          Your family space.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: 0, maxWidth: 520 }}>
          A private, invite-only space where your family's stories, voices, and legacy come together.
        </p>
      </div>

      {/* Member roster by generation */}
      <div style={{ marginBottom: 48 }}>
        {[1, 2, 3, 4].map(gen => (
          <div key={gen} style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)', margin: '0 0 14px' }}>
              {genLabels[gen]}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(byGen[gen] || []).map(m => {
                const count = kinloomsByAuthor[m.id] || 0;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 12px 10px', background: '#fff', border: `1px solid ${m.isMe ? 'rgba(85,107,91,0.40)' : '#d4d2cc'}`, borderRadius: 12 }}>
                    <Silhouette member={m} size={44} />
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{m.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
                        {m.role}{m.deceased ? ' · Passed' : ''} · {count > 0 ? `${count} kinloom${count !== 1 ? 's' : ''}` : 'No kinlooms yet'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
        {[
          { href: '/family/feed',    label: 'Family kinlooms',  desc: 'See what your family has been creating.' },
          { href: '/family/tree',    label: 'Family tree',      desc: 'Visualize relationships across generations.' },
          { href: '/family/members', label: 'Manage members',   desc: "Invite and manage who's in your space." },
        ].map(s => (
          <Link key={s.href} href={s.href} style={{ display: 'block', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '24px 22px', textDecoration: 'none' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 6px', color: '#1a1a1a' }}>{s.label}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(26,26,26,0.65)', margin: 0 }}>{s.desc}</p>
          </Link>
        ))}
      </div>

      {/* Invite CTA */}
      <div style={{ background: 'rgba(85,107,91,0.05)', border: '1px solid rgba(85,107,91,0.20)', borderRadius: 12, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 6px', color: '#1a1a1a' }}>Invite your family</h3>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.65)', margin: 0 }}>Your family space is invite-only. Bring in the people who matter.</p>
        </div>
        <Link href="/family/members" style={{ display: 'inline-block', background: '#556b5b', color: '#fdfcfa', padding: '11px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', flexShrink: 0 }}>
          Manage members
        </Link>
      </div>

    </div>
  );
}
