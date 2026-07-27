import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../lib/server/auth';
import { getHome, getLibraryServer } from '../../../lib/server/queries';
import {
  bodyParagraphs,
  formatKinloomDate,
  normalizeList,
  type KinloomAuthor,
  type KinloomMedia,
  type LibraryRow,
} from '../../../lib/kinloom';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';
import { paginate, parsePageParam } from '../../../lib/pagination';
import Pagination from '../../components/Pagination';
import LibraryFilters from './LibraryFilters';

export const dynamic = 'force-dynamic';

function Silhouette({ member, size = 22, idKey }: { member: KinloomAuthor; size?: number; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} className="silhouette">
      <defs><clipPath id={`clip-lib-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-lib-${idKey})`}>
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

function rowExcerpt(row: LibraryRow): string {
  if (row.excerpt) return row.excerpt;
  if (row.body_paragraphs) {
    const first = bodyParagraphs(row.body_paragraphs)[0] ?? '';
    return first.length > 180 ? `${first.slice(0, 180).trim()}...` : first;
  }
  return '';
}

function hasAudio(row: LibraryRow): boolean { return Boolean(row.has_audio ?? row.audio?.url); }
function hasPhoto(row: LibraryRow): boolean {
  if (row.has_photo != null) return row.has_photo;
  const photos = normalizeList<KinloomMedia>(row.photos);
  return photos.length > 0 || Boolean(row.photo?.url);
}

function KinloomCard({ row }: { row: LibraryRow }) {
  const excerpt = rowExcerpt(row);
  const date = formatKinloomDate(row.created_at);
  return (
    <Link href={`/library/${row.ulid}`} className="kinloom-card">
      <div className="kinloom-card__top">
        {row.type_label && <span className="badge">{row.type_label}</span>}
        {hasAudio(row) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>}
        {hasPhoto(row) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(26,26,26,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
      </div>
      <h3 className="kinloom-card__title">{row.title || 'Untitled'}</h3>
      {excerpt && <p className="kinloom-card__excerpt">{excerpt}</p>}
      {row.author && (
        <div className="kinloom-card__byline">
          <Silhouette member={row.author} size={22} idKey={`${row.ulid}-${row.author.member_id}`} />
          <span>{row.author.name}</span>
          {date && <><span>·</span><span>{date}</span></>}
        </div>
      )}
    </Link>
  );
}

type Search = { type?: string; q?: string; page?: string };

export default async function LibraryPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const [{ kinlooms: allKinlooms }, home, activeSpace] = await Promise.all([
    getLibraryServer(familySpaceId),
    getHome(familySpaceId),
    getActiveSpace(),
  ]);

  // Library is the signed-in user's own kinlooms. Other members' pieces live
  // in /family/feed. The /library endpoint returns the whole space and has no
  // author filter, so scope to the current member here.
  // /home's user_summary.member_id is authoritative for the current member;
  // family_spaces[].member_id is optional and often absent on /me.
  const myMemberId = home.userSummary?.member_id || activeSpace?.member_id || null;
  const kinlooms = myMemberId
    ? allKinlooms.filter(r => r.author?.member_id === myMemberId)
    : allKinlooms;
  const total = kinlooms.length;

  const type = searchParams?.type || '';
  const q = (searchParams?.q || '').trim().toLowerCase();
  const filtered = kinlooms.filter(r => {
    const matchType = !type || type === 'All' || r.type_label === type;
    const matchQ = !q
      || (r.title || '').toLowerCase().includes(q)
      || rowExcerpt(r).toLowerCase().includes(q);
    return matchType && matchQ;
  });

  const { items: pageRows, page, totalPages } = paginate(filtered, parsePageParam(searchParams?.page));

  const typeLabels = KINLOOM_TYPES.map(t => t.label);

  return (
    <div className="library-page">
      <div className="library-page__header">
        <p className="eyebrow">Library</p>
        <div className="library-page__title-row">
          <h1 className="library-page__title">Your kinlooms</h1>
          <Link href="/create" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create
          </Link>
        </div>
        <p className="library-page__sub">
          {total} piece{total === 1 ? '' : 's'} in your library.
        </p>
      </div>

      <LibraryFilters types={typeLabels} type={type} q={q} />

      {kinlooms.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Your library is empty.</p>
          <Link href="/create" className="empty-card__cta">Write your first kinloom →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing matches that yet.</p>
        </div>
      ) : (
        <>
          <div className="home-kinloom-grid">
            {pageRows.map(row => <KinloomCard key={row.ulid} row={row} />)}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/library"
            params={{ type, q: searchParams?.q }}
            totalItems={filtered.length}
            label="Library pages"
          />
        </>
      )}
    </div>
  );
}
