import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../lib/server/auth';
import { getHome, type HomeRecentKinloom, type HomeWhisper } from '../../../lib/server/queries';
import { KINLOOM_TYPE_MAP } from '../../lib/kinloom-types';
import { formatKinloomDate } from '../../../lib/kinloom';

export const dynamic = 'force-dynamic';

function TypeBadge({ slug, label }: { slug: string; label?: string }) {
  const fallback = KINLOOM_TYPE_MAP[slug]?.label;
  const text = label || fallback;
  if (!text) return null;
  return <span className="badge">{text}</span>;
}

function AuthorSilhouette({ author, size = 22, idKey }: { author: HomeRecentKinloom['author']; size?: number; idKey: string }) {
  if (!author) return null;
  const gender = author.gender || 'n';
  const tone = author.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={author.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-home-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-home-${idKey})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
    </svg>
  );
}

function KinloomCard({ k }: { k: HomeRecentKinloom }) {
  return (
    <Link href={`/library/${k.ulid}`} className="kinloom-card">
      <div className="kinloom-card__top">
        <TypeBadge slug={k.type_slug} label={k.type_label} />
        {k.has_audio && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>}
        {k.has_photo && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
      </div>
      <h3 className="kinloom-card__title">{k.title || 'Untitled'}</h3>
      {k.excerpt && <p className="kinloom-card__excerpt">{k.excerpt}</p>}
      {k.author && (
        <div className="kinloom-card__byline">
          <AuthorSilhouette author={k.author} size={22} idKey={`${k.ulid}-${k.author.member_id}`} />
          <span>{k.author.name}</span>
          <span>·</span>
          <span>{formatKinloomDate(k.created_at)}</span>
        </div>
      )}
    </Link>
  );
}

function WhisperRow({ w, isLast }: { w: HomeWhisper; isLast: boolean }) {
  // target is normalized to a string ulid (or null) in getHome — never interpolate objects.
  const href = typeof w.target === 'string' && w.target
    ? `/library/${w.target}`
    : '/family/feed';
  return (
    <Link href={href} className={`whisper-row${isLast ? ' is-last' : ''}`}>
      {w.actor ? (
        <AuthorSilhouette author={w.actor} size={36} idKey={`whisper-${w.id}`} />
      ) : (
        <span className="whisper-row__heart" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
        </span>
      )}
      <div className="whisper-row__body">
        <p className="whisper-row__line">{w.line}</p>
        {w.sub && <p className="whisper-row__sub">{w.sub}</p>}
      </div>
      {w.when && <span className="whisper-row__when">{w.when}</span>}
    </Link>
  );
}

export default async function HomePage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const data = await getHome(familySpaceId);
  const { recentKinlooms, recentWhispers, legacyBankProgress } = data;
  const total = legacyBankProgress.total_kinlooms;
  const target = legacyBankProgress.target || 50;
  const pct = legacyBankProgress.percent != null
    ? Math.max(0, Math.min(100, Math.round(legacyBankProgress.percent)))
    : Math.min(100, Math.round((total / target) * 100));

  return (
    <div className="home-page">
      <div className="home-page__header">
        <p className="eyebrow">Your family space</p>
        <h1 className="home-page__title">Welcome home.</h1>
        <p className="home-page__intro">A few new things from your family this week. Take your time.</p>
      </div>

      <div className="home-actions">
        {[
          { label: 'Create a kinloom', desc: 'Capture something worth preserving.', href: '/create', primary: true },
          { label: 'Your library',      desc: "Review what you've already captured.", href: '/library', primary: false },
          { label: 'Family space',      desc: 'See what your family has shared.', href: '/family', primary: false },
        ].map(a => (
          <Link key={a.href} href={a.href} className={`home-action${a.primary ? ' is-primary' : ''}`}>
            <h3 className="home-action__title">{a.label}</h3>
            <p className="home-action__desc">{a.desc}</p>
          </Link>
        ))}
      </div>

      <Link href="/legacy-bank" className="legacy-bank-card">
        <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" className="legacy-bank-card__bg" aria-hidden="true">
          <path d="M 0 50 Q 50 20, 100 50 T 200 50" fill="none" stroke="#556b5b" strokeWidth="0.6" />
          <path d="M 0 30 Q 50 60, 100 30 T 200 30" fill="none" stroke="#a39376" strokeWidth="0.6" />
          <path d="M 0 70 Q 50 40, 100 70 T 200 70" fill="none" stroke="#556b5b" strokeWidth="0.6" />
          <circle cx="200" cy="50" r="2" fill="#556b5b" /><circle cx="200" cy="30" r="2" fill="#a39376" /><circle cx="200" cy="70" r="2" fill="#556b5b" />
        </svg>
        <div className="legacy-bank-card__grid">
          <div>
            <div className="legacy-bank-card__pillrow">
              <span className="legacy-bank-card__pill"><span className="legacy-bank-card__dot" />Quietly building</span>
              <span className="legacy-bank-card__future">a future feature</span>
            </div>
            <h3 className="legacy-bank-card__title">Your AI Legacy Bank.</h3>
            <p className="legacy-bank-card__lede">
              Every kinloom you keep adds to a voice your family will be able to ask questions of, long after the asking is no longer easy.
            </p>
            <div className="legacy-bank-card__progress">
              <div className="legacy-bank-card__track"><div className="legacy-bank-card__bar" style={{ width: `${pct}%` }} /></div>
              <p className="legacy-bank-card__count">
                <strong>{total}</strong>{' of ~'}{target}{' kinlooms gathered'}
              </p>
            </div>
            <p className="legacy-bank-card__note">The more your family keeps, the richer the voice becomes.</p>
          </div>
          <span className="legacy-bank-card__cta">
            Learn more
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </Link>

      <div className="home-section__head">
        <h2 className="home-section__title">Your kinlooms</h2>
        <Link href="/library" className="home-section__link">View all</Link>
      </div>
      {recentKinlooms.length > 0 ? (
        <div className="home-kinloom-grid">
          {recentKinlooms.slice(0, 4).map(k => <KinloomCard key={k.ulid} k={k} />)}
        </div>
      ) : (
        <p className="home-empty">Nothing here yet. <Link href="/create">Create your first kinloom</Link>.</p>
      )}

      <div className="home-section__head home-section__head--spaced">
        <h2 className="home-section__title">Family kinlooms</h2>
        <Link href="/family/feed" className="home-section__link">View all</Link>
      </div>
      {recentWhispers.length > 0 ? (
        <div className="whisper-list">
          {recentWhispers.slice(0, 3).map((w, i) => (
            <WhisperRow key={w.id} w={w} isLast={i === Math.min(2, recentWhispers.length - 1)} />
          ))}
        </div>
      ) : (
        <p className="home-empty">No family activity yet.</p>
      )}
    </div>
  );
}
