import Link from 'next/link';
import { KINLOOMS, MEMBERS, MEMBER_MAP, WHISPERS, type Kinloom, type Member, type Whisper } from '../../lib/mock-data';
import { KINLOOM_TYPE_MAP } from '../../lib/kinloom-types';

function TypeBadge({ slug }: { slug: string }) {
  const t = KINLOOM_TYPE_MAP[slug];
  if (!t) return null;
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
      {t.label}
    </span>
  );
}

function Silhouette({ member, size = 40 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376', isMe } = member;
  const hairLong = gender === 'f';
  const hairShort = gender === 'm';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-home-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-home-${member.id})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {hairLong && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={hairLong ? 11 : 10} fill={tone} opacity="0.78" />
        {hairShort && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {hairLong && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
      {isMe && <circle cx="40" cy="40" r="38" fill="none" stroke="#556b5b" strokeWidth="1.5" strokeDasharray="2 3" opacity="0.9" />}
    </svg>
  );
}

function KinloomCard({ kinloom, href }: { kinloom: Kinloom; href: string }) {
  const author = MEMBER_MAP[kinloom.author];
  return (
    <Link href={href} style={{ display: 'block', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 24, textDecoration: 'none', transition: 'box-shadow 200ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <TypeBadge slug={kinloom.type} />
        {kinloom.hasAudio && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>}
        {kinloom.hasPhoto && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
      </div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 8px', color: '#1a1a1a', lineHeight: 1.25 }}>
        {kinloom.title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)', margin: '0 0 16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {kinloom.excerpt}
      </p>
      {author && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>
          <Silhouette member={author} size={22} />
          <span>{author.name}</span>
          <span>·</span>
          <span>{kinloom.date}</span>
        </div>
      )}
    </Link>
  );
}

function WhisperRow({ whisper, isLast }: { whisper: Whisper; isLast: boolean }) {
  const actor = MEMBER_MAP[whisper.actor];
  const href = whisper.target ? `/library/${whisper.target}` : '/family/feed';
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: isLast ? 'none' : '1px solid #d4d2cc', textDecoration: 'none' }}>
      {actor ? <Silhouette member={actor} size={36} /> : (
        <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f4f1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#556b5b', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        </span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(26,26,26,0.85)' }}>{whisper.line}</p>
        {whisper.sub && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(26,26,26,0.5)', fontStyle: 'italic' }}>{whisper.sub}</p>}
      </div>
      <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', flexShrink: 0 }}>{whisper.when}</span>
    </Link>
  );
}

const total = KINLOOMS.length;
const target = 50;
const pct = Math.min(100, Math.round((total / target) * 100));

export default function HomePage() {
  const recent = KINLOOMS.slice(0, 4);
  const feed = WHISPERS.slice(0, 3);

  return (
    <div style={{ padding: '48px', maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 56 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Your family space</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, lineHeight: 1.1, margin: '0 0 16px', letterSpacing: '-0.005em', color: '#1a1a1a' }}>
          Welcome home.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: 0, maxWidth: 600 }}>
          A few new things from your family this week. Take your time.
        </p>
      </div>

      {/* Action cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 56 }}>
        {[
          { label: 'Create a kinloom',  desc: 'Capture something worth preserving.',     href: '/create',  primary: true },
          { label: 'Your library',      desc: "Review what you've already captured.",     href: '/library', primary: false },
          { label: 'Family space',      desc: 'See what your family has shared.',         href: '/family',  primary: false },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ display: 'block', padding: '24px 26px', background: a.primary ? '#556b5b' : '#fff', border: `1px solid ${a.primary ? 'transparent' : '#d4d2cc'}`, borderRadius: 12, textDecoration: 'none' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 8px', color: a.primary ? '#fdfcfa' : '#1a1a1a' }}>
              {a.label}
            </h3>
            <p style={{ fontSize: 14, margin: 0, color: a.primary ? 'rgba(253,252,250,0.78)' : 'rgba(26,26,26,0.65)', lineHeight: 1.55 }}>
              {a.desc}
            </p>
          </Link>
        ))}
      </div>

      {/* AI Legacy Bank card */}
      <div style={{ marginBottom: 56 }}>
        <Link href="/legacy-bank" style={{ display: 'block', padding: '32px 36px', background: 'linear-gradient(135deg, rgba(85,107,91,0.08) 0%, rgba(163,147,118,0.06) 100%)', border: '1px solid rgba(85,107,91,0.18)', borderRadius: 14, textDecoration: 'none', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, right: 0, width: 280, height: '100%', opacity: 0.18, pointerEvents: 'none' }} aria-hidden="true">
            <path d="M 0 50 Q 50 20, 100 50 T 200 50" fill="none" stroke="#556b5b" strokeWidth="0.6" />
            <path d="M 0 30 Q 50 60, 100 30 T 200 30" fill="none" stroke="#a39376" strokeWidth="0.6" />
            <path d="M 0 70 Q 50 40, 100 70 T 200 70" fill="none" stroke="#556b5b" strokeWidth="0.6" />
            <circle cx="200" cy="50" r="2" fill="#556b5b" /><circle cx="200" cy="30" r="2" fill="#a39376" /><circle cx="200" cy="70" r="2" fill="#556b5b" />
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center', position: 'relative' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(85,107,91,0.12)', border: '1px solid rgba(85,107,91,0.22)', borderRadius: 9999, fontSize: 10, color: '#556b5b', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#556b5b' }} />
                  Quietly building
                </span>
                <span style={{ fontSize: 11, color: 'rgba(26,26,26,0.5)', fontStyle: 'italic' }}>a future feature</span>
              </div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, lineHeight: 1.2, margin: '0 0 10px', color: '#1a1a1a' }}>
                Your AI Legacy Bank.
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(26,26,26,0.65)', margin: '0 0 20px', maxWidth: 520 }}>
                Every kinloom you keep adds to a voice your family will be able to ask questions of, long after the asking is no longer easy.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                <div style={{ flex: '0 0 200px', height: 4, background: 'rgba(85,107,91,0.12)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#556b5b', borderRadius: 2 }} />
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.65)' }}>
                  <strong style={{ color: '#1a1a1a', fontWeight: 500 }}>{total}</strong>{' of ~'}{target}{' kinlooms gathered'}
                </p>
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.5)', fontStyle: 'italic' }}>
                The more your family keeps, the richer the voice becomes.
              </p>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#556b5b', fontWeight: 500, flexShrink: 0, alignSelf: 'flex-end' }}>
              Learn more
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
        </Link>
      </div>

      {/* Your kinlooms */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: 0, color: '#1a1a1a' }}>Your kinlooms</h2>
        <Link href="/library" style={{ fontSize: 14, color: '#556b5b', textDecoration: 'none' }}>View all</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 56 }}>
        {recent.map(k => <KinloomCard key={k.id} kinloom={k} href={`/library/${k.id}`} />)}
      </div>

      {/* Family kinlooms */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: 0, color: '#1a1a1a' }}>Family kinlooms</h2>
        <Link href="/family/feed" style={{ fontSize: 14, color: '#556b5b', textDecoration: 'none' }}>View all</Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, overflow: 'hidden' }}>
        {feed.map((w, i) => <WhisperRow key={w.id} whisper={w} isLast={i === feed.length - 1} />)}
      </div>

    </div>
  );
}
