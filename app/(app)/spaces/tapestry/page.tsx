import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyOverview, getLibraryServer, type FamilyMember } from '../../../../lib/server/queries';
import {
  formatKinloomDate,
  normalizeList,
  type KinloomMedia,
  type LibraryRow,
} from '../../../../lib/kinloom';
import { KINLOOM_TYPES } from '../../../lib/kinloom-types';
import { orNull } from '../../../../lib/server/safe';
import DataNotice from '../../../components/DataNotice';

export const dynamic = 'force-dynamic';

type Shape = { cw: number; ch: number; imgMin?: string; tiSize: string; radius: string };

/**
 * The mosaic's four shapes, on a 12-column dense grid. Taken from the
 * design: a feature every fifth piece, audio and quotes breaking the
 * rhythm, everything else a half-width image card.
 */
const SHAPES: Record<'feature' | 'image' | 'quote' | 'audio', Shape> = {
  feature: { cw: 8, ch: 4, imgMin: 'clamp(200px, 26vw, 380px)', tiSize: 'clamp(23px, 2.9vw, 38px)', radius: '16px' },
  image:   { cw: 4, ch: 3, imgMin: 'clamp(130px, 14vw, 190px)', tiSize: 'clamp(17px, 1.9vw, 22px)', radius: '12px' },
  quote:   { cw: 8, ch: 3, tiSize: 'clamp(17px, 1.9vw, 22px)', radius: '16px' },
  audio:   { cw: 4, ch: 3, tiSize: 'clamp(18px, 2vw, 24px)', radius: '12px' },
};

function photoUrl(row: LibraryRow): string | null {
  const photos = normalizeList<KinloomMedia>(row.photos);
  return photos[0]?.url || row.photo?.url || null;
}

/** Deterministic stand-in for a real waveform, seeded off the title. */
function wave(seed: number) {
  return Array.from({ length: 30 }, (_, j) => ({
    h: `${20 + Math.round(Math.abs(Math.sin((j + seed) * 1.7)) * 78)}%`,
    played: j < 10,
  }));
}

function Byline({ row }: { row: LibraryRow }) {
  const tone = row.author?.tone || '#a39376';
  return (
    <span className="tap-by">
      <span className="tap-by__dot" style={{ background: `${tone}44` }} aria-hidden="true" />
      <span className="tap-by__name">
        {row.author?.name}
        {row.created_at && ` · ${formatKinloomDate(row.created_at)}`}
      </span>
    </span>
  );
}

function PersonCard({ m, homeName }: { m: FamilyMember; homeName: string }) {
  return (
    <Link href={`/portrait/${m.member_id}`} className="tap-person">
      <span
        className="tap-person__face"
        style={{ background: `${m.tone || '#a39376'}28`, color: m.tone || '#556b5b' }}
        aria-hidden="true"
      >
        {m.initials || m.name?.charAt(0) || '?'}
      </span>
      <span className="tap-person__name">{m.name}</span>
      <span className="tap-person__rel">{m.kin_term || m.role_label || 'Member'}</span>
      <span className="tap-person__home">{homeName}</span>
    </Link>
  );
}

type Search = { view?: string; person?: string; type?: string; sort?: string };

export default async function FamilyTapestryPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const [library, overview, activeSpace] = await Promise.all([
    orNull(getLibraryServer(familySpaceId)),
    getFamilyOverview(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const all = library?.kinlooms ?? [];

  const spaceName = activeSpace?.name?.trim() || 'this Family Space';
  const people = (overview?.generations ?? []).flatMap(g => g.members);
  const generations = overview?.generations.length ?? 0;
  const voices = all.filter(r => r.has_audio).length;

  const isPeople = searchParams?.view === 'people';
  const person = searchParams?.person || '';
  const type = searchParams?.type || '';
  const sort = searchParams?.sort === 'oldest' ? 'oldest' : 'recent';

  let rows = all.filter(r => {
    const matchPerson = !person || r.author?.member_id === person;
    const matchType = !type || r.type_label === type;
    return matchPerson && matchType;
  });
  rows = [...rows].sort((a, b) => {
    const cmp = (a.created_at || '').localeCompare(b.created_at || '');
    return sort === 'oldest' ? cmp : -cmp;
  });

  const summary = [
    person ? people.find(p => p.member_id === person)?.name || 'One person' : 'Everyone',
    'every home',
    `sorted by ${sort === 'oldest' ? 'oldest' : 'recent'}`,
  ].join(', ');

  const q = (next: Partial<Search>) => {
    const sp = new URLSearchParams();
    const merged = { view: searchParams?.view, person, type, sort, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === 'sort' && v === 'recent')) sp.set(k, String(v));
    }
    const s = sp.toString();
    return `/spaces/tapestry${s ? `?${s}` : ''}`;
  };

  return (
    <div className="tap-page">
      <section className="tap-head">
        <p className="eyebrow">The Family Tapestry</p>
        <h1 className="tap-head__title">Everything {spaceName} has kept.</h1>
        <p className="tap-head__lead">
          {all.length} kinloom{all.length === 1 ? '' : 's'} from {people.length || '—'} people
          in {spaceName}. Narrow it to whoever you came here for.
        </p>
        <nav className="tap-views" aria-label="Tapestry view">
          <Link href={q({ view: undefined })} className={`tap-view${isPeople ? '' : ' is-active'}`}>Kinlooms</Link>
          <Link href={q({ view: 'people' })} className={`tap-view${isPeople ? ' is-active' : ''}`}>People</Link>
        </nav>
      </section>

      {library === null && (
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
          <div className="tap-facts">
            <span className="tap-fact"><b>{all.length}</b> kinlooms kept</span>
            <span className="tap-fact"><b>{voices}</b> recorded voices</span>
            <span className="tap-fact"><b>{generations || '—'}</b> generations represented</span>
          </div>
        </div>
      </section>

      {!isPeople && (
        <section className="tap-filterbar">
          <details className="tap-filters">
            <summary className="tap-filters__summary">
              <span className="tap-filters__label">Filter and sort</span>
              <span className="tap-filters__state">{summary}</span>
              <span className="tap-filters__count">
                {rows.length} of {all.length} kinlooms
              </span>
            </summary>
            <div className="tap-filters__panel">
              <div>
                <p className="tap-filters__group">Person</p>
                <div className="tap-filters__opts">
                  <Link href={q({ person: undefined })} className={`tap-chip${person ? '' : ' is-on'}`}>Everyone</Link>
                  {people.map(p => (
                    <Link key={p.member_id} href={q({ person: p.member_id })} className={`tap-chip${person === p.member_id ? ' is-on' : ''}`}>
                      {p.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="tap-filters__group">Type</p>
                <div className="tap-filters__opts">
                  <Link href={q({ type: undefined })} className={`tap-chip${type ? '' : ' is-on'}`}>All</Link>
                  {KINLOOM_TYPES.map(t => (
                    <Link key={t.slug} href={q({ type: t.label })} className={`tap-chip${type === t.label ? ' is-on' : ''}`}>
                      {t.label}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <p className="tap-filters__group">Sort</p>
                <div className="tap-filters__opts">
                  <Link href={q({ sort: 'recent' })} className={`tap-chip${sort === 'recent' ? ' is-on' : ''}`}>Recent</Link>
                  <Link href={q({ sort: 'oldest' })} className={`tap-chip${sort === 'oldest' ? ' is-on' : ''}`}>Oldest</Link>
                </div>
              </div>
            </div>
          </details>
        </section>
      )}

      <section className="tap-body">
        {isPeople ? (
          people.length === 0 ? (
            <div className="empty-card"><p className="empty-card__text">Nobody is in this space yet.</p></div>
          ) : (
            <div className="tap-people">
              {people.map(m => <PersonCard key={m.member_id} m={m} homeName={spaceName} />)}
            </div>
          )
        ) : rows.length === 0 ? (
          <div className="empty-card">
            <p className="empty-card__text">Nothing matches that yet.</p>
          </div>
        ) : (
          <div className="tap-mosaic">
            {rows.map((row, i) => {
              const img = photoUrl(row);
              const kind = row.has_audio ? 'audio' : i % 5 === 0 ? 'feature' : 'image';
              const shape = SHAPES[kind];
              const style = {
                gridColumn: `span ${shape.cw}`,
                gridRow: `span ${shape.ch}`,
                borderRadius: shape.radius,
              } as React.CSSProperties;

              if (kind === 'audio') {
                const bars = wave(row.title?.length || 7);
                return (
                  <Link key={row.ulid} href={`/library/${row.ulid}`} className="tap-card tap-card--audio" style={style}>
                    <span className="tap-audio__head">
                      <span
                        className="tap-audio__face"
                        style={{ background: `${row.author?.tone || '#a39376'}28` }}
                        aria-hidden="true"
                      />
                      <span className="tap-audio__text">
                        <span className="tap-card__home">
                          {row.type_label} · in {row.author?.name?.split(' ')[0]}’s voice
                        </span>
                        <span className="tap-card__title" style={{ fontSize: shape.tiSize }}>
                          {row.title || 'Untitled'}
                        </span>
                        <span className="tap-card__sub">{row.author?.name}</span>
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
                <Link key={row.ulid} href={`/library/${row.ulid}`} className="tap-card" style={style}>
                  <span
                    className={`tap-card__img${img ? '' : ' tap-card__img--none'}`}
                    style={{
                      minHeight: shape.imgMin,
                      ...(img ? { backgroundImage: `url(${img})` } : {}),
                    }}
                    aria-hidden="true"
                  />
                  <span className="tap-card__body">
                    <span className="tap-card__home">{spaceName}</span>
                    {row.type_label && <span className="tap-card__type">{row.type_label}</span>}
                    <span className="tap-card__title" style={{ fontSize: shape.tiSize }}>
                      {row.title || 'Untitled'}
                    </span>
                    <Byline row={row} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

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
