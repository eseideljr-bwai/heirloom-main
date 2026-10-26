import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError } from '../../../lib/api';
import { requireHome } from '../../../lib/server/auth';
import { serverKinloomApi } from '../../../lib/server/kinloom-api';
import type { components } from '../../../lib/api-schema/typed';
import { parsePageParam } from '../../../lib/pagination';
import Pagination from '../../components/Pagination';

export const dynamic = 'force-dynamic';

/** The Vault pages at 20, not the app-wide default of 10. */
const VAULT_PAGE_SIZE = 20;

type VaultItem = components['schemas']['VaultItem'];
type Audience = 'everything' | 'private' | 'home' | 'space';

/**
 * The four filters the design draws. `audience` is a server-side filter on
 * `GET /vault`, so each one is a real query and the counts and pages come
 * back correct. (The API also has `after_passing`, for kinlooms waiting to
 * be released after the author passes; it has no chip in the design yet.)
 */
const VIEWS: { key: '' | Exclude<Audience, 'everything'>; label: string }[] = [
  { key: '',        label: 'Everything' },
  { key: 'private', label: 'Private' },
  { key: 'home',    label: 'In your Family Home' },
  { key: 'space',   label: 'In a Family Space' },
];

type ViewKey = (typeof VIEWS)[number]['key'];

function publicationYear(item: VaultItem): string {
  // The card shows a publication date in the design, but the Vault item
  // carries only `created_at`, so that is what the year comes from.
  const d = new Date(item.created_at);
  return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
}

/** One chip per room the kinloom is published to, pending ones marked. */
function chipsFor(item: VaultItem): { key: string; label: string; muted?: boolean }[] {
  const rooms = item.publications.map(p => ({
    key: `${p.type}-${p.id}-${p.when}`,
    label: p.when === 'on_passing' ? `${p.name} · after I pass` : p.name,
  }));
  if (item.status === 'draft') {
    return [{ key: 'draft', label: 'Draft', muted: true }, ...rooms];
  }
  // Final and published nowhere: the absence of a publication, not a place.
  if (rooms.length === 0) return [{ key: 'private', label: 'Private', muted: true }];
  return rooms;
}

function VaultCard({ item }: { item: VaultItem }) {
  const year = publicationYear(item);
  const href = `/library/${item.id}`;
  const published = item.publications.length > 0;
  return (
    <article className="vault-card">
      <div className="vault-card__chips">
        {chipsFor(item).map(c => (
          <span key={c.key} className={`vault-chip${c.muted ? ' vault-chip--private' : ''}`}>
            {c.label}
          </span>
        ))}
      </div>

      <p className="vault-card__type">{item.type.label}</p>

      <h2 className="vault-card__title">
        <Link href={href}>{item.title || 'Untitled'}</Link>
      </h2>

      <div className="vault-card__foot">
        {year && <span className="vault-card__date">{year}</span>}
        {item.status === 'final' && (
          <Link href={`/create/publish?k=${item.id}`} className="vault-card__action">
            {published ? 'Publish elsewhere…' : 'Publish…'}
          </Link>
        )}
      </div>
    </article>
  );
}

type Search = { view?: string; page?: string };

export default async function VaultPage({ searchParams }: { searchParams?: Search }) {
  const requested = (searchParams?.view || '') as ViewKey;
  const view: ViewKey = VIEWS.some(v => v.key === requested) ? requested : '';
  const requestedPage = parsePageParam(searchParams?.page);

  // `GET /vault` is the signed-in person's own, so it needs nothing from the
  // Home check below. Start it first and let the two run side by side: the
  // page waits for the slower of the two instead of for both in turn. The
  // result is captured as a value so a redirect from the guard can't leave
  // this promise rejecting unhandled.
  const vaultRequest = serverKinloomApi
    .get('/vault', {
      query: { audience: view || 'everything', page: requestedPage, per_page: VAULT_PAGE_SIZE },
    })
    .then(
      (data) => ({ data }),
      (error: unknown) => ({ error }),
    );

  // Redirects unauthenticated and not-yet-onboarded visitors.
  await requireHome();

  const result = await vaultRequest;
  if ('error' in result) {
    if (!(result.error instanceof ApiError)) throw result.error;
    return (
      <div className="vault-page">
        <p className="eyebrow">My Vault</p>
        <h1 className="vault-page__title">Everything you have written.</h1>
        <div className="empty-card">
          <p className="empty-card__text">We couldn’t load your Vault just now.</p>
          <p className="empty-card__sub">
            Nothing you have written is affected. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }
  const vault = result.data;

  const { data: items, meta, counts } = vault;

  // A `?page=` left over from a wider filter points past the end, which the
  // API answers with an empty page. Land on the last real one instead.
  if (items.length === 0 && meta.total > 0 && requestedPage > meta.last_page) {
    const params = new URLSearchParams();
    if (view) params.set('view', view);
    if (meta.last_page > 1) params.set('page', String(meta.last_page));
    const query = params.toString();
    redirect(`/vault${query ? `?${query}` : ''}`);
  }

  const total = meta.total;
  const first = total === 0 ? 0 : (meta.page - 1) * meta.per_page + 1;
  const last = Math.min(meta.page * meta.per_page, total);

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

      {counts.summary.everything === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Your vault is empty.</p>
          <Link href="/create" className="empty-card__cta">Write your first kinloom →</Link>
        </div>
      ) : total === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">
            {view === 'private'
              ? 'Everything you have written is published somewhere.'
              : 'Nothing is published there yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="vault-grid">
            {items.map(item => (
              <VaultCard key={item.id} item={item} />
            ))}
          </div>
          <Pagination
            page={meta.page}
            totalPages={meta.last_page}
            basePath="/vault"
            params={{ view: view || undefined }}
            totalItems={total}
            pageSize={meta.per_page}
            label="Vault pages"
          />
        </>
      )}
    </div>
  );
}
