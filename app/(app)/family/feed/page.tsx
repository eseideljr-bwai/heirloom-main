import Link from 'next/link';
import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyFeed, type Whisper } from '../../../../lib/server/queries';
import { formatKinloomDate, type KinloomAuthor, type LibraryRow } from '../../../../lib/kinloom';
import { paginate, parsePageParam } from '../../../../lib/pagination';
import Pagination from '../../../components/Pagination';

export const dynamic = 'force-dynamic';

function Silhouette({ author, size = 36, idKey }: { author: KinloomAuthor; size?: number; idKey: string }) {
  const gender = author.gender || 'n';
  const tone = author.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={author.name} className="silhouette">
      <defs><clipPath id={`clip-feed-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-feed-${idKey})`}>
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

function KinloomFeedCard({ k }: { k: LibraryRow }) {
  return (
    <Link href={`/library/${k.ulid}`} className="feed-card">
      {k.author && <Silhouette author={k.author} size={40} idKey={`feed-${k.ulid}`} />}
      <div className="feed-card__body">
        <div className="feed-card__meta">
          {k.author && <span className="feed-card__author">{k.author.name}</span>}
          <span className="feed-card__dot">·</span>
          {k.type_label && <span className="badge badge--sm">{k.type_label}</span>}
          {k.created_at && <span className="feed-card__date">{formatKinloomDate(k.created_at)}</span>}
        </div>
        <h3 className="feed-card__title">{k.title || 'Untitled'}</h3>
        {k.excerpt && <p className="feed-card__excerpt">{k.excerpt}</p>}
        <div className="feed-card__chips">
          {k.has_audio && (
            <span className="feed-card__chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
              Voice
            </span>
          )}
          {k.has_photo && (
            <span className="feed-card__chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              Photo
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function WhisperRow({ w, idKey }: { w: Whisper; idKey: string }) {
  const href = typeof w.target === 'string' && w.target
    ? `/library/${w.target}`
    : '/family';
  return (
    <Link href={href} className="whisper-row whisper-row--compact">
      {w.actor ? (
        <Silhouette author={w.actor} size={32} idKey={`w-${idKey}`} />
      ) : (
        <span className="whisper-row__heart whisper-row__heart--sm" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
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

type Search = { page?: string };

export default async function FamilyFeedPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const { whispers, kinlooms, totals } = await getFamilyFeed(familySpaceId);

  const { items: pageRows, page, totalPages } = paginate(kinlooms, parsePageParam(searchParams?.page));

  return (
    <div className="feed-page">

      <div className="feed-page__back">
        <Link href="/family" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Family
        </Link>
      </div>

      <p className="eyebrow feed-page__eyebrow">Family kinlooms</p>
      <h1 className="feed-page__title">What your family has shared.</h1>
      <p className="feed-page__sub">
        {totals.kinlooms} kinloom{totals.kinlooms === 1 ? '' : 's'} from {totals.contributors} family member{totals.contributors === 1 ? '' : 's'}.
      </p>

      <div className="feed-section">
        <h2 className="feed-section__title">Recent activity</h2>
        <p className="feed-section__sub">Updates and moments from your family.</p>
        {whispers.length > 0 ? (
          whispers.map((w, i) => <WhisperRow key={w.id ?? `w-${i}`} w={w} idKey={String(w.id ?? i)} />)
        ) : (
          <p className="home-empty">No recent activity.</p>
        )}
      </div>

      <div className="feed-section" id="family-kinlooms">
        <h2 className="feed-section__title">Kinlooms from your family</h2>
        <p className="feed-section__sub">Stories, lessons, and wisdom shared by your family members.</p>
        {kinlooms.length > 0 ? (
          <>
            {pageRows.map(k => <KinloomFeedCard key={k.ulid} k={k} />)}
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/family/feed"
              hash="family-kinlooms"
              totalItems={kinlooms.length}
              label="Family kinloom pages"
            />
          </>
        ) : (
          <div className="empty-card">
            <p className="empty-card__text">Nothing here yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
