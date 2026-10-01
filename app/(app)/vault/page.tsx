import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../lib/server/auth';
import { getHome, getLibraryServer } from '../../../lib/server/queries';
import type { LibraryRow } from '../../../lib/kinloom';
import { paginate, parsePageParam } from '../../../lib/pagination';
import Pagination from '../../components/Pagination';

export const dynamic = 'force-dynamic';

/** The Vault pages at 20, not the app-wide default of 10. */
const VAULT_PAGE_SIZE = 20;

const VIEWS = [
  { key: '',        label: 'Everything' },
  { key: 'private', label: 'Private' },
  { key: 'home',    label: 'In your Family Home' },
  { key: 'space',   label: 'In a Family Space' },
] as const;

type ViewKey = (typeof VIEWS)[number]['key'];

type Audience = { label: string; kind: 'home' | 'space' };

/**
 * Where a kinloom is published.
 *
 * The model this screen is designed for gives every kinloom a *list* of
 * publication targets — its Home, and any Family Spaces it was published
 * onward to. The API still carries a single `visibility: 'family' |
 * 'private'`, so that list is at most one entry long today and the
 * "In a Family Space" view can never match.
 *
 * Every assumption about that shape lives in this one function. When the
 * publications endpoint lands (backend Workstream 4.2) this is the only
 * thing that has to change — the filter, the chips and the counts all
 * read from it.
 */
function audiencesFor(row: LibraryRow, homeLabel: string): Audience[] {
  if (row.visibility === 'private') return [];
  // `visibility` is optional on LibraryRow and may be absent from the list
  // payload altogether. 'family' is the create-time default, so an absent
  // value is read as published to the Home rather than silently dropped
  // out of every view. See the note in the page body about verifying
  // whether the endpoint returns private kinlooms at all.
  return [{ label: homeLabel, kind: 'home' }];
}

function matchesView(audiences: Audience[], view: ViewKey): boolean {
  if (view === 'private') return audiences.length === 0;
  if (view === 'home') return audiences.some(a => a.kind === 'home');
  if (view === 'space') return audiences.some(a => a.kind === 'space');
  return true;
}

function publicationYear(row: LibraryRow): string {
  // The design labels each card with its publication date. Nothing in the
  // payload carries one — there is no `published_at` on the row or in the
  // API spec — so this falls back to when the kinloom was created.
  if (!row.created_at) return '';
  const d = new Date(row.created_at);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

function VaultCard({ row, audiences }: { row: LibraryRow; audiences: Audience[] }) {
  const year = publicationYear(row);
  const href = `/library/${row.ulid}`;
  return (
    <article className="vault-card">
      <div className="vault-card__chips">
        {audiences.length > 0 ? (
          audiences.map(a => (
            <span key={`${a.kind}-${a.label}`} className="vault-chip">{a.label}</span>
          ))
        ) : (
          <span className="vault-chip vault-chip--private">Private</span>
        )}
      </div>

      {row.type_label && <p className="vault-card__type">{row.type_label}</p>}

      <h2 className="vault-card__title">
        <Link href={href}>{row.title || 'Untitled'}</Link>
      </h2>

      <div className="vault-card__foot">
        {year && <span className="vault-card__date">{year}</span>}
        <Link href={href} className="vault-card__action">
          {audiences.length > 0 ? 'Publish elsewhere…' : 'Publish…'}
        </Link>
      </div>
    </article>
  );
}

type Search = { view?: string; page?: string };

export default async function VaultPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const [{ kinlooms: allKinlooms }, home, activeSpace] = await Promise.all([
    getLibraryServer(familySpaceId),
    getHome(familySpaceId),
    getActiveSpace(),
  ]);

  // The Vault is only ever the signed-in person's own writing. The library
  // endpoint returns the whole space and takes no author filter, so scope
  // it here. /home's user_summary.member_id is authoritative for the
  // current member; family_spaces[].member_id is optional and often absent
  // on /me. The API is inconsistent about ULID casing, so compare lowercased.
  const myMemberIds = new Set(
    [home.userSummary?.member_id, activeSpace?.member_id]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .map(v => v.toLowerCase()),
  );

  if (myMemberIds.size === 0) {
    return (
      <div className="vault-page">
        <p className="eyebrow">My Vault</p>
        <h1 className="vault-page__title">Everything you have written.</h1>
        <div className="empty-card">
          <p className="empty-card__text">
            We couldn&rsquo;t load your vault right now. Please refresh the page or try again shortly.
          </p>
        </div>
      </div>
    );
  }

  const mine = allKinlooms.filter(
    r => r.author?.member_id && myMemberIds.has(String(r.author.member_id).toLowerCase()),
  );

  // Today's single container becomes the Family Home, so its name is the
  // label on a "published to your Home" chip.
  const homeLabel = activeSpace?.name?.trim() || 'Your Family Home';

  const rows = mine.map(row => ({ row, audiences: audiencesFor(row, homeLabel) }));

  const requested = (searchParams?.view || '') as ViewKey;
  const view: ViewKey = VIEWS.some(v => v.key === requested) ? requested : '';

  const filtered = rows.filter(r => matchesView(r.audiences, view));
  const total = filtered.length;

  const { items, page, totalPages } = paginate(
    filtered,
    parsePageParam(searchParams?.page),
    VAULT_PAGE_SIZE,
  );

  const first = total === 0 ? 0 : (page - 1) * VAULT_PAGE_SIZE + 1;
  const last = Math.min(page * VAULT_PAGE_SIZE, total);

  const viewHref = (key: ViewKey) => (key ? `/vault?view=${key}` : '/vault');

  return (
    <div className="vault-page">
      <p className="eyebrow">My Vault</p>
      <h1 className="vault-page__title">Everything you have written.</h1>
      <p className="vault-page__intro">
        This is where your kinlooms live. Publishing points an audience at them;
        it never moves them out of here.
      </p>

      <p className="vault-page__range">
        {total === 0
          ? 'No kinlooms'
          : `${first}–${last} of ${total} kinloom${total === 1 ? '' : 's'}`}
      </p>

      <nav className="vault-filters" aria-label="Filter by where it is published">
        {VIEWS.map(v => (
          <Link
            key={v.key || 'all'}
            href={viewHref(v.key)}
            className={`vault-filter${v.key === view ? ' is-active' : ''}`}
            aria-current={v.key === view ? 'true' : undefined}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Your vault is empty.</p>
          <Link href="/create" className="empty-card__cta">Write your first kinloom →</Link>
        </div>
      ) : total === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing is published there yet.</p>
        </div>
      ) : (
        <>
          <div className="vault-grid">
            {items.map(({ row, audiences }) => (
              <VaultCard key={row.ulid} row={row} audiences={audiences} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/vault"
            params={{ view: view || undefined }}
            totalItems={total}
            pageSize={VAULT_PAGE_SIZE}
            label="Vault pages"
          />
        </>
      )}
    </div>
  );
}
