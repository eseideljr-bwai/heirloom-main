import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { requireHome } from '../../../lib/server/auth';
import { serverKinloomApi } from '../../../lib/server/kinloom-api';
import { getFamilyHome } from '../../../lib/server/queries';
import type { components } from '../../../lib/api-schema/typed';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';
import { parsePageParam } from '../../../lib/pagination';
import { parseDayParam } from '../../../lib/date-filter';
import Pagination from '../../components/Pagination';
import LibraryFilters from './LibraryFilters';
import DataNotice from '../../components/DataNotice';

type KinloomCard = components['schemas']['KinloomCard'];

export const dynamic = 'force-dynamic';

/** Cards carry images, so a smaller page than the Vault's text list. */
const LIBRARY_PAGE_SIZE = 12;

const SPELLED = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function Silhouette({ member, idKey }: { member: { name: string; gender?: string; tone?: string }; idKey: string }) {
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

function year(card: KinloomCard): string {
  if (!card.created_at) return '';
  const d = new Date(card.created_at);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function LibraryCard({ card, homeId, homeName }: { card: KinloomCard; homeId: string; homeName: string }) {
  const when = year(card);
  const author = card.author;
  return (
    // Opened through this Home's room, so its comments are this Home's.
    <Link href={`/library/${card.id}?room=home:${homeId}`} className="lib-card">
      {card.thumbnail_url && (
        // Lazy and async: twelve cards should not hold up the first paint.
        <img className="lib-card__img" src={card.thumbnail_url} alt="" loading="lazy" decoding="async" />
      )}
      <span className="lib-card__body">
        <span className="lib-card__home">{homeName}</span>
        <span className="lib-card__type">{card.type.label}</span>
        <span className="lib-card__title">{card.title || 'Untitled'}</span>
        <span className="lib-card__by">
          <Silhouette member={'id' in author ? author : { name: author.name }} idKey={`${card.id}-${author.name}`} />
          <span className="lib-card__byname">
            {author.name}{when && ` · ${when}`}
          </span>
        </span>
      </span>
    </Link>
  );
}

type Search = { type?: string; q?: string; page?: string; from?: string; to?: string };

export default async function OurLibraryPage({ searchParams }: { searchParams?: Search }) {
  const { homeId, home } = await requireHome();

  const homeName = home.name?.trim() || 'your Family Home';

  // Our Library is the joint view: everything every member of this Home has
  // published to it, not just your own. That is the whole difference between
  // this page and My Vault, so there is deliberately no author filter here.
  // Filtering, search and paging are the API's: the page asks for exactly the
  // 12 cards it shows.
  const type = searchParams?.type || '';
  const q = (searchParams?.q || '').trim();
  const from = parseDayParam(searchParams?.from);
  const to = parseDayParam(searchParams?.to);
  const requestedPage = parsePageParam(searchParams?.page);
  const typeSlug = KINLOOM_TYPES.find(t => t.label === type)?.slug;

  // Independent of the library request, so the two run together. The lead
  // line only needs a head count; if it fails the page still renders.
  const homeReq = getFamilyHome(homeId).catch(() => null);

  let result;
  try {
    result = await serverKinloomApi.get('/family-homes/{familyHome}/library', {
      path: { familyHome: homeId },
      query: {
        ...(type && type !== 'All' ? { 'types[]': [typeSlug ?? type] } : {}),
        ...(q ? { q } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        page: requestedPage,
        per_page: LIBRARY_PAGE_SIZE,
      },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    result = null;
  }

  // Past the last page (a stale ?page= after a filter narrowed the list):
  // land on the last one instead of an empty grid.
  if (result && result.data.length === 0 && result.meta.total > 0 && requestedPage > result.meta.last_page) {
    const sp = new URLSearchParams();
    if (type) sp.set('type', type);
    if (q) sp.set('q', q);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    if (result.meta.last_page > 1) sp.set('page', String(result.meta.last_page));
    redirect(`/library${sp.toString() ? `?${sp}` : ''}`);
  }

  const items = result?.data ?? [];
  const total = result?.meta.total ?? 0;
  const page = result?.meta.page ?? 1;
  const totalPages = result?.meta.last_page ?? 1;
  const first = total === 0 ? 0 : (page - 1) * LIBRARY_PAGE_SIZE + 1;
  const last = Math.min(page * LIBRARY_PAGE_SIZE, total);
  const filtering = Boolean(type || q || from || to);

  const memberCount = (await homeReq)?.stats.members ?? 0;
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

      {result === null && <DataNotice what="the kinlooms published to this home" />}

      <p className="lib-page__count">
        {total === 0
          ? 'Nothing published here yet'
          : `${first}–${last} of ${total} kinloom${total === 1 ? '' : 's'} published to your Family Home`}
      </p>

      <LibraryFilters types={KINLOOM_TYPES.map(t => t.label)} type={type} q={q.toLowerCase()} from={from} to={to} />

      {items.length === 0 && !filtering ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing has been published to this home yet.</p>
          <Link href="/create?from=library" className="empty-card__cta">Write the first one →</Link>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing matches that yet.</p>
        </div>
      ) : (
        <>
          <div className="lib-grid">
            {items.map(card => (
              <LibraryCard key={card.id} card={card} homeId={homeId} homeName={homeName} />
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
