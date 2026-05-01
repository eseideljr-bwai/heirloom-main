import Link from 'next/link';
import { KINLOOMS, MEMBER_MAP, WHISPERS, type Kinloom, type Whisper, type Member } from '../../../lib/mock-data';
import { KINLOOM_TYPE_MAP } from '../../../lib/kinloom-types';

function Silhouette({ member, size = 36 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376', isMe } = member;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-feed-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-feed-${member.id})`}>
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

function KinloomFeedCard({ kinloom }: { kinloom: Kinloom }) {
  const author = MEMBER_MAP[kinloom.author];
  const type = KINLOOM_TYPE_MAP[kinloom.type];
  return (
    <Link href={`/library/${kinloom.id}`} style={{ display: 'flex', gap: 16, padding: '20px 0', borderBottom: '1px solid #d4d2cc', textDecoration: 'none' }}>
      {author && <Silhouette member={author} size={40} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {author && <span style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{author.name}</span>}
          <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)' }}>·</span>
          {type && (
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
              {type.label}
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(26,26,26,0.4)', flexShrink: 0 }}>{kinloom.date}</span>
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 19, margin: '0 0 6px', color: '#1a1a1a', lineHeight: 1.3 }}>
          {kinloom.title}
        </h3>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(26,26,26,0.65)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {kinloom.excerpt}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          {kinloom.hasAudio && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(26,26,26,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
              Voice
            </span>
          )}
          {kinloom.hasPhoto && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'rgba(26,26,26,0.45)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              Photo
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function WhisperRow({ whisper }: { whisper: Whisper }) {
  const actor = MEMBER_MAP[whisper.actor];
  const href = whisper.target ? `/library/${whisper.target}` : '/family';
  return (
    <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #d4d2cc', textDecoration: 'none' }}>
      {actor ? <Silhouette member={actor} size={32} /> : (
        <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(85,107,91,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#556b5b', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        </span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(26,26,26,0.85)' }}>{whisper.line}</p>
        {whisper.sub && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(26,26,26,0.5)', fontStyle: 'italic' }}>{whisper.sub}</p>}
      </div>
      <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)', flexShrink: 0 }}>{whisper.when}</span>
    </Link>
  );
}

export default function FamilyFeedPage() {
  const familyKinlooms = KINLOOMS.filter(k => k.author !== 'you');

  return (
    <div style={{ padding: '48px', maxWidth: 760 }}>

      <div style={{ borderBottom: '1px solid #d4d2cc', paddingBottom: 20, marginBottom: 40 }}>
        <Link href="/family" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Family
        </Link>
      </div>

      <p className="eyebrow" style={{ marginBottom: 12 }}>Family kinlooms</p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 42, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        What your family has shared.
      </h1>
      <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.65)', margin: '0 0 48px' }}>
        {KINLOOMS.length} kinlooms from {KINLOOMS.map(k => k.author).filter((v, i, a) => a.indexOf(v) === i).length} family members.
      </p>

      {/* Recent activity */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: '0 0 4px', color: '#1a1a1a' }}>Recent activity</h2>
        <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.5)', margin: '0 0 20px' }}>Updates and moments from your family.</p>
        <div>
          {WHISPERS.map(w => <WhisperRow key={w.id} whisper={w} />)}
        </div>
      </div>

      {/* Family kinlooms */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: '0 0 4px', color: '#1a1a1a' }}>Kinlooms from your family</h2>
        <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.5)', margin: '0 0 8px' }}>Stories, lessons, and wisdom shared by your family members.</p>
        <div>
          {familyKinlooms.map(k => <KinloomFeedCard key={k.id} kinloom={k} />)}
        </div>
        {familyKinlooms.length === 0 && (
          <div className="empty-card">
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.45)', margin: 0 }}>
              Nothing here yet.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
