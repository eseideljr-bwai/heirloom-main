import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../lib/server/auth';
import { getLibraryServer, getManageMembers } from '../../../lib/server/queries';
import {
  bodyParagraphs,
  normalizeList,
  type KinloomAuthor,
  type KinloomMedia,
  type LibraryRow,
} from '../../../lib/kinloom';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';
import { paginate, parsePageParam } from '../../../lib/pagination';
import { matchesDateRange, parseDayParam } from '../../../lib/date-filter';
import Pagination from '../../components/Pagination';
import LibraryFilters from './LibraryFilters';
import { orNull } from '../../../lib/server/safe';
import DataNotice from '../../components/DataNotice';

export const dynamic = 'force-dynamic';

/** Cards carry images, so a smaller page than the Vault's text list. */
const LIBRARY_PAGE_SIZE = 12;

const SPELLED = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function Silhouette({ member, idKey }: { member: KinloomAuthor; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  return (
    <svg viewBox="0 0 80 80" width={24} height={24} aria-hidden="true" className="lib-card__face">
      <defs><clipPath id={`clip-lib-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-lib-${idKey})`}>
        <rect width="80" height="80" fill={`${tone}22`} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
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

function photoUrl(row: LibraryRow): string | null {
  const photos = normalizeList<KinloomMedia>(row.photos);
  return photos[0]?.url || row.photo?.url || null;
}

function year(row: LibraryRow): string {
  if (!row.created_at) return '';
  const d = new Date(row.created_at);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function LibraryCard({ row, homeName }: { row: LibraryRow; homeName: string }) {
  const img = photoUrl(row);
  const when = year(row);
  return (
    <Link href={`/library/${row.ulid}`} className="lib-card">
      {img && (
        <span
          className="lib-card__img"
          role="img"
          aria-label={row.title || 'Untitled'}
          style={{ backgroundImage: `url(${img})` }}
        />
      )}
      <span className="lib-card__body">
        <span className="lib-card__home">{homeName}</span>
        {row.type_label && <span className="lib-card__type">{row.type_label}</span>}
        <span className="lib-card__title">{row.title || 'Untitled'}</span>
        {row.author && (
          <span className="lib-card__by">
            <Silhouette member={row.author} idKey={`${row.ulid}-${row.author.member_id}`} />
            <span className="lib-card__byname">
              {row.author.name}{when && ` · ${when}`}
            </span>
          </span>
        )}
      </span>
    </Link>
  );
}

type Search = { type?: string; q?: string; page?: string; from?: string; to?: string };

export default async function OurLibraryPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const [library, activeSpace, manage] = await Promise.all([
    orNull(getLibraryServer(familySpaceId)),
    getActiveSpace(),
    getManageMembers(familySpaceId).catch(() => null),
  ]);

  const all = library?.kinlooms ?? [];

  // Our Library is the joint view: everything every member of this Home has
  // published to it, not just your own. That is the whole difference between
  // this page and My Vault — so there is deliberately no author filter here.
  //
  // Until the backend separates Homes from Family Spaces there is only one
  // container, so "published to this Home" is simply the space library.
  const homeName = activeSpace?.name?.trim() || 'your Family Home';
  const memberCount = manage?.members.length ?? 0;

  const type = searchParams?.type || '';
  const q = (searchParams?.q || '').trim().toLowerCase();
  const from = parseDayParam(searchParams?.from);
  const to = parseDayParam(searchParams?.to);

  const filtered = all.filter(r => {
    const matchType = !type || type === 'All' || r.type_label === type;
    const matchQ = !q
      || (r.title || '').toLowerCase().includes(q)
      || rowExcerpt(r).toLowerCase().includes(q)
      || (r.author?.name || '').toLowerCase().includes(q);
    return matchType && matchQ && matchesDateRange(r.created_at, from, to);
  });

  const total = filtered.length;
  const { items, page, totalPages } = paginate(
    filtered,
    parsePageParam(searchParams?.page),
    LIBRARY_PAGE_SIZE,
  );
  const first = total === 0 ? 0 : (page - 1) * LIBRARY_PAGE_SIZE + 1;
  const last = Math.min(page * LIBRARY_PAGE_SIZE, total);

  const people = memberCount > 1 && memberCount < 10 ? SPELLED[memberCount] : null;

  return (
    <div className="lib-page">
      <p className="eyebrow">Our Library</p>
      <h1 className="lib-page__title">Published to {homeName}.</h1>
      <p className="lib-page__lead">
        {people
          ? `Every kinloom the ${people} of you have published to this home.`
          : 'Every kinloom published to this home.'}{' '}
        Each one still lives in the vault of whoever wrote it.
      </p>

      {library === null && <DataNotice what="the kinlooms published to this home" />}

      <p className="lib-page__count">
        {total === 0
          ? 'Nothing published here yet'
          : `${first}–${last} of ${total} kinloom${total === 1 ? '' : 's'} published to your Family Home`}
      </p>

      <LibraryFilters types={KINLOOM_TYPES.map(t => t.label)} type={type} q={q} from={from} to={to} />

      {all.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing has been published to this home yet.</p>
          <Link href="/create?from=library" className="empty-card__cta">Write the first one →</Link>
        </div>
      ) : total === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing matches that yet.</p>
        </div>
      ) : (
        <>
          <p
            className="lib-page__flag no-api"
            data-api-scope="out"
            data-api-note={"GET /family-homes/{homeId}/library → HomeLibraryPage\n→ data[] · KinloomCard — carries has_photo, but no media and no media id\nNo thumbnail/cover/image field exists anywhere in the API, and this endpoint takes no include param.\nTo show a cover today: GET /kinlooms/{kinloomCard.id} → KinloomDetail.media[0].url. That is one detail call per card (12 a page here, more on the Tapestry) — workable for a few, not for a grid. GET /media/{id}/url does not help: the card exposes no media id to pass it.\nAsk: a nullable thumbnail_url on KinloomCard. Precedent — TapestryLeadCard already carries media."}
          >
            Cards render without covers: the library payload says whether a
            kinloom has a photo, but never where to find it.
          </p>

          <div className="lib-grid">
            {items.map(row => (
              <LibraryCard key={row.ulid} row={row} homeName={homeName} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/library"
            params={{ type, q: searchParams?.q, from, to }}
            totalItems={total}
            pageSize={LIBRARY_PAGE_SIZE}
            label="Library pages"
          />
        </>
      )}
    </div>
  );
}
