import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { getActiveFamilySpaceId, requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { formatKinloomDate, type PersonOrNameOnly } from '../../../../lib/kinloom';
import { parsePageParam } from '../../../../lib/pagination';
import type { components } from '../../../../lib/api-schema/typed';
import { KINLOOM_TYPES } from '../../../lib/kinloom-types';
import DataNotice from '../../../components/DataNotice';
import NoFamilySpace from '../../../components/NoFamilySpace';
import Pagination from '../../../components/Pagination';

export const dynamic = 'force-dynamic';

type TapestryCard = components['schemas']['TapestryKinloomCard'];
type QuoteCard = components['schemas']['TapestryQuoteCard'];
type LeadCard = components['schemas']['TapestryLeadCard'];
type TapestryPerson = components['schemas']['TapestryPersonCard'];

/** Cards carry images, so a smaller page than a text list. */
const TAPESTRY_PAGE_SIZE = 12;
/** The people filter lists everyone in one go: the API's page maximum. */
const PEOPLE_LIMIT = 50;

type Shape = { cw: number; ch: number; imgMin?: string; tiSize: string; radius: string };

/**
 * The mosaic's four shapes, on a 12-column dense grid. Taken from the
 * design: a feature every fifth piece, audio and quotes breaking the
 * rhythm, everything else a half-width image card.
 */
const SHAPES: Record<'feature' | 'image' | 'quote' | 'audio', Shape> = {
  feature: { cw: 8, ch: 4, imgMin: 'clamp(200px, 26vw, 380px)', tiSize: 'clamp(23px, 2.9vw, 38px)', radius: '16px' },
  image:   { cw: 4, ch: 3, imgMin: 'clamp(130px, 14vw, 190px)', tiSize: 'clamp(17px, 1.9vw, 22px)', radius: '12px' },
  quote:   { cw: 4, ch: 4, tiSize: 'clamp(17px, 1.9vw, 22px)', radius: '16px' },
  audio:   { cw: 4, ch: 3, tiSize: 'clamp(18px, 2vw, 24px)', radius: '12px' },
};

const SORTS = [
  { key: 'recent', label: 'Recent' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'by_home', label: 'By home' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

const tone = (p: PersonOrNameOnly) => ('id' in p ? p.tone : '#a39376') || '#a39376';

/** Deterministic stand-in for a real waveform, seeded off the title. */
function wave(seed: number) {
  return Array.from({ length: 30 }, (_, j) => ({
    h: `${20 + Math.round(Math.abs(Math.sin((j + seed) * 1.7)) * 78)}%`,
    played: j < 10,
  }));
}

function Byline({ card }: { card: TapestryCard }) {
  return (
    <span className="tap-by">
      <span className="tap-by__dot" style={{ background: `${tone(card.author)}44` }} aria-hidden="true" />
      <span className="tap-by__name">
        {card.author.name}
        {card.created_at && ` · ${formatKinloomDate(card.created_at)}`}
      </span>
    </span>
  );
}

function PersonTile({ p }: { p: TapestryPerson }) {
  return (
    <Link href={`/portrait/${p.id}`} className="tap-person">
      <span
        className="tap-person__face"
        style={{ background: `${p.tone || '#a39376'}28`, color: p.tone || '#556b5b' }}
        aria-hidden="true"
      >
        {p.initials || p.name?.charAt(0) || '?'}
      </span>
      <span className="tap-person__name">{p.name}</span>
      <span className="tap-person__rel">{p.label || 'Member'}</span>
      <span className="tap-person__home">
        {p.home.name} · {p.kinlooms} kinloom{p.kinlooms === 1 ? '' : 's'}
      </span>
    </Link>
  );
}

type Search = { view?: string; person?: string; home?: string; type?: string; sort?: string; page?: string };

export default async function FamilyTapestryPage({ searchParams }: { searchParams?: Search }) {
  await requireHome();
  const spaceId = await getActiveFamilySpaceId();
  if (!spaceId) return <NoFamilySpace what="the Family Tapestry" />;

  const isPeople = searchParams?.view === 'people';
  const person = searchParams?.person || '';
  const home = searchParams?.home || '';
  const typeSlug = KINLOOM_TYPES.find(t => t.slug === searchParams?.type)?.slug ?? '';
  const sort: SortKey = SORTS.find(s => s.key === searchParams?.sort)?.key ?? 'recent';
  const requestedPage = parsePageParam(searchParams?.page);

  // The unfiltered people list feeds the Person and Home filters, so it is
  // always read. The page itself (kinlooms, or the People view) is the second
  // request; the two are independent, one round of waiting.
  const orNullApi = (err: unknown) => {
    if (err instanceof ApiError) return null;
    throw err;
  };
  const everyoneReq = serverKinloomApi
    .get('/family-spaces/{familySpace}/tapestry', {
      path: { familySpace: spaceId },
      query: { view: 'people', per_page: PEOPLE_LIMIT },
    })
    .catch(orNullApi);

  const pageReq = serverKinloomApi
    .get('/family-spaces/{familySpace}/tapestry', {
      path: { familySpace: spaceId },
      query: isPeople
        ? { view: 'people', ...(home ? { home } : {}), page: requestedPage, per_page: TAPESTRY_PAGE_SIZE * 2 }
        : {
            view: 'kinlooms',
            ...(typeSlug ? { 'types[]': [typeSlug] } : {}),
            ...(person ? { person } : {}),
            ...(home ? { home } : {}),
            sort,
            page: requestedPage,
            per_page: TAPESTRY_PAGE_SIZE,
          },
    })
    .catch(orNullApi);

  const [everyoneRes, main] = await Promise.all([everyoneReq, pageReq]);
  const space = main?.space ?? everyoneRes?.space ?? null;
  const facts = main?.facts ?? everyoneRes?.facts ?? null;

  const spaceName = space?.name?.trim() || 'this Family Space';
  const everyone = (everyoneRes?.data ?? []) as TapestryPerson[];
  // The Homes in the Space, for the Home filter, taken from its people.
  const homes = Array.from(new Map(everyone.map(p => [p.home.id, p.home.name])));

  // Past the last page (a stale ?page= after a filter narrowed the list):
  // land on the last one instead of an empty grid.
  if (main && main.data.length === 0 && main.meta.total > 0 && requestedPage > main.meta.last_page) {
    const sp = new URLSearchParams();
    if (isPeople) sp.set('view', 'people');
    if (person) sp.set('person', person);
    if (home) sp.set('home', home);
    if (typeSlug) sp.set('type', typeSlug);
    if (sort !== 'recent') sp.set('sort', sort);
    if (main.meta.last_page > 1) sp.set('page', String(main.meta.last_page));
    redirect(`/spaces/tapestry${sp.toString() ? `?${sp}` : ''}`);
  }

  const rows = (isPeople ? [] : (main?.data ?? [])) as TapestryCard[];
  const peopleRows = (isPeople ? (main?.data ?? []) : []) as TapestryPerson[];
  const total = main?.meta.total ?? 0;
  const page = main?.meta.page ?? 1;
  const totalPages = main?.meta.last_page ?? 1;
  const pageSize = isPeople ? TAPESTRY_PAGE_SIZE * 2 : TAPESTRY_PAGE_SIZE;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const filtering = Boolean(person || home || typeSlug);

  // The owner's featured picks lead the first, unfiltered page. Cards already
  // shown there are left out of the list below so nothing appears twice.
  const featured = !isPeople && !filtering && page === 1 && sort === 'recent' ? main?.featured : null;
  const lead: LeadCard | null = featured?.lead ?? null;
  const quote: QuoteCard | null = featured?.quote ?? null;
  const pins: TapestryCard[] = featured?.pins ?? [];
  const featuredIds = new Set<string>([lead?.id, quote?.id, ...pins.map(p => p.id)].filter((x): x is string => Boolean(x)));
  const listed = rows.filter(r => !featuredIds.has(r.id));

  const personName = everyone.find(p => p.id === person)?.name;
  const homeName = homes.find(([id]) => id === home)?.[1];
  const summary = [
    personName || (person ? 'One person' : 'Everyone'),
    homeName || (home ? 'one home' : 'every home'),
    typeSlug ? KINLOOM_TYPES.find(t => t.slug === typeSlug)?.label : null,
    `sorted ${sort === 'oldest' ? 'oldest first' : sort === 'by_home' ? 'by home' : 'by recent'}`,
  ].filter(Boolean).join(', ');

  const href = (next: Partial<Search>, withPage = false) => {
    const sp = new URLSearchParams();
    const merged: Search = { view: searchParams?.view, person, home, type: typeSlug, sort, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === 'sort' && v === 'recent')) sp.set(k, String(v));
    }
    if (withPage && merged.page && merged.page !== '1') sp.set('page', merged.page);
    const s = sp.toString();
    return `/spaces/tapestry${s ? `?${s}` : ''}`;
  };

  const roomHref = (id: string) => `/library/${id}?room=space:${spaceId}`;
  const peopleCount = isPeople ? total : (everyoneRes?.meta.total ?? null);

  const renderCard = (row: TapestryCard, i: number, opts?: { kind?: 'feature' | 'image'; image?: string | null }) => {
    const img = opts?.image === undefined ? row.thumbnail_url : opts.image;
    const kind = opts?.kind ?? (row.has_audio ? 'audio' : i % 5 === 0 ? 'feature' : 'image');
    const shape = SHAPES[kind];
    const style = { gridColumn: `span ${shape.cw}`, gridRow: `span ${shape.ch}`, borderRadius: shape.radius } as React.CSSProperties;

    if (kind === 'audio') {
      const bars = wave(row.title?.length || 7);
      return (
        <Link key={row.id} href={roomHref(row.id)} className="tap-card tap-card--audio" style={style}>
          <span className="tap-audio__head">
            <span className="tap-audio__face" style={{ background: `${tone(row.author)}28` }} aria-hidden="true" />
            <span className="tap-audio__text">
              <span className="tap-card__home">
                {row.type.label} · in {row.author.name.split(' ')[0]}’s voice
              </span>
              <span className="tap-card__title" style={{ fontSize: shape.tiSize }}>{row.title || 'Untitled'}</span>
              <span className="tap-card__sub">{row.home?.name ?? row.author.name}</span>
            </span>
          </span>
          <span className="tap-audio__player">
            <span className="tap-audio__play" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
            </span>
            <span className="tap-audio__wave" aria-hidden="true">
              {bars.map((b, j) => (
                <span key={j} className={`tap-audio__bar${b.played ? ' is-played' : ''}`} style={{ height: b.h }} />
              ))}
            </span>
          </span>
        </Link>
      );
    }

    return (
      <Link key={row.id} href={roomHref(row.id)} className="tap-card" style={style}>
        {img ? (
          <img
            className="tap-card__img tap-card__img--photo"
            src={img}
            alt=""
            loading={i < 3 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ minHeight: shape.imgMin }}
          />
        ) : (
          <span className="tap-card__img tap-card__img--none" style={{ minHeight: shape.imgMin }} aria-hidden="true" />
        )}
        <span className="tap-card__body">
          <span className="tap-card__home">{row.home?.name ?? spaceName}</span>
          {row.type.label && <span className="tap-card__type">{row.type.label}</span>}
          <span className="tap-card__title" style={{ fontSize: shape.tiSize }}>{row.title || 'Untitled'}</span>
          <Byline card={row} />
        </span>
      </Link>
    );
  };

  const renderQuote = (q: QuoteCard) => {
    const shape = SHAPES.quote;
    return (
      <Link
        key={`quote-${q.id}`}
        href={roomHref(q.id)}
        className="tap-card tap-card--quote"
        style={{ gridColumn: `span ${shape.cw}`, gridRow: `span ${shape.ch}`, borderRadius: shape.radius }}
      >
        <span className="tap-quote__text" style={{ fontSize: shape.tiSize }}>“{q.featured_quote}”</span>
        <span className="tap-quote__by">
          {q.author.name}
          {q.home && ` · ${q.home.name}`}
        </span>
      </Link>
    );
  };

  return (
    <div className="tap-page">
      <section className="tap-head">
        <p className="eyebrow">The Family Tapestry</p>
        <h1 className="tap-head__title">Everything {spaceName} has kept.</h1>
        <p className="tap-head__lead">
          {facts ? `${facts.kinlooms_kept} kinloom${facts.kinlooms_kept === 1 ? '' : 's'}` : 'Every kinloom'}
          {peopleCount ? ` from ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}` : ''} in {spaceName}.
          Narrow it to whoever you came here for.
        </p>
        <nav className="tap-views" aria-label="Tapestry view">
          <Link href={href({ view: undefined, page: undefined })} className={`tap-view${isPeople ? '' : ' is-active'}`}>Kinlooms</Link>
          <Link href={href({ view: 'people', person: '', type: '', sort: 'recent', page: undefined })} className={`tap-view${isPeople ? ' is-active' : ''}`}>People</Link>
        </nav>
      </section>

      {main === null && (
        <section className="tap-head">
          <DataNotice what="the kinlooms published to this Family Space" />
        </section>
      )}

      <section className="tap-band">
        <div className="tap-band__inner">
          <div>
            <p className="tap-band__eyebrow">The tapestry keeps growing</p>
            <h2 className="tap-band__head">Nothing here was chosen by an algorithm.</h2>
            <p className="tap-band__body">
              Every family chose every person, photograph and voice on this page.
              Kinloom only decided how to hold them.
            </p>
            <div className="tap-band__cta">
              <Link href="/create?from=tapestry" className="tap-band__btn">Create a kinloom</Link>
              <Link href="/spaces/tree" className="tap-band__btn tap-band__btn--ghost">See the family tree</Link>
            </div>
          </div>
          {facts && (
            <div className="tap-facts">
              <span className="tap-fact"><b>{facts.kinlooms_kept}</b> kinlooms kept</span>
              <span className="tap-fact"><b>{facts.recorded_voices}</b> recorded voices</span>
              {facts.generations > 0 && (
                <span className="tap-fact"><b>{facts.generations}</b> generations represented</span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="tap-filterbar">
        <details className="tap-filters">
          <summary className="tap-filters__summary">
            <span className="tap-filters__label">Filter and sort</span>
            <span className="tap-filters__state">{isPeople ? (homeName ?? 'Every home') : summary}</span>
            <span className="tap-filters__count">
              {isPeople ? `${total} ${total === 1 ? 'person' : 'people'}` : `${total} of ${facts?.kinlooms_kept ?? total} kinlooms`}
            </span>
          </summary>
          <div className="tap-filters__panel">
            {homes.length > 1 && (
              <div>
                <p className="tap-filters__group">Home</p>
                <div className="tap-filters__opts">
                  <Link href={href({ home: '', page: undefined })} className={`tap-chip${home ? '' : ' is-on'}`}>Every home</Link>
                  {homes.map(([id, name]) => (
                    <Link key={id} href={href({ home: id, page: undefined })} className={`tap-chip${home === id ? ' is-on' : ''}`}>
                      {name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {!isPeople && (
              <>
                <div>
                  <p className="tap-filters__group">Person</p>
                  <div className="tap-filters__opts">
                    <Link href={href({ person: '', page: undefined })} className={`tap-chip${person ? '' : ' is-on'}`}>Everyone</Link>
                    {everyone.map(p => (
                      <Link key={p.id} href={href({ person: p.id, page: undefined })} className={`tap-chip${person === p.id ? ' is-on' : ''}`}>
                        {p.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="tap-filters__group">Type</p>
                  <div className="tap-filters__opts">
                    <Link href={href({ type: '', page: undefined })} className={`tap-chip${typeSlug ? '' : ' is-on'}`}>All</Link>
                    {KINLOOM_TYPES.map(t => (
                      <Link key={t.slug} href={href({ type: t.slug, page: undefined })} className={`tap-chip${typeSlug === t.slug ? ' is-on' : ''}`}>
                        {t.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="tap-filters__group">Sort</p>
                  <div className="tap-filters__opts">
                    {SORTS.map(s => (
                      <Link key={s.key} href={href({ sort: s.key, page: undefined })} className={`tap-chip${sort === s.key ? ' is-on' : ''}`}>
                        {s.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </details>
      </section>

      <section className="tap-body">
        {total > 0 && (
          <p className="tap-count">
            {first}–{last} of {total} {isPeople ? (total === 1 ? 'person' : 'people') : `kinloom${total === 1 ? '' : 's'}`}
          </p>
        )}

        {isPeople ? (
          peopleRows.length === 0 ? (
            <div className="empty-card"><p className="empty-card__text">Nobody is in this Family Space yet.</p></div>
          ) : (
            <div className="tap-people">
              {peopleRows.map(p => <PersonTile key={p.id} p={p} />)}
            </div>
          )
        ) : listed.length === 0 && !lead && !quote && pins.length === 0 ? (
          <div className="empty-card">
            <p className="empty-card__text">
              {filtering ? 'Nothing matches that yet.' : 'Nothing has been published to this Family Space yet.'}
            </p>
          </div>
        ) : (
          <div className="tap-mosaic">
            {lead && renderCard(lead, 0, { kind: 'feature', image: lead.media?.type === 'image' ? lead.media.url : lead.thumbnail_url })}
            {quote && renderQuote(quote)}
            {pins.map((p, i) => renderCard(p, i + 1, { kind: 'image' }))}
            {listed.map((row, i) => renderCard(row, i + 1))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/spaces/tapestry"
          params={{ view: isPeople ? 'people' : undefined, person, home, type: typeSlug, sort: sort === 'recent' ? undefined : sort }}
          totalItems={total}
          pageSize={pageSize}
          label="Tapestry pages"
        />

        <div className="tap-foot">
          <p className="tap-foot__line">
            Every piece here was chosen by the person who made it.
            Add one and the tapestry grows.
          </p>
          <Link href="/create?from=tapestry" className="tap-foot__cta">Add to your family’s story</Link>
        </div>
      </section>
    </div>
  );
}
