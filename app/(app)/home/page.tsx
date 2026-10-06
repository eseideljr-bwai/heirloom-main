import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../lib/server/auth';
import {
  getHome,
  getManageMembers,
  type FamilyMember,
  type HomeRecentKinloom,
} from '../../../lib/server/queries';
import { formatKinloomDate } from '../../../lib/kinloom';

export const dynamic = 'force-dynamic';

/**
 * My Home — the Family Home's own page.
 *
 * Several modules here have no backend behind them yet: there is no Home
 * entity, no featured content, no founding year, no motto, and drafts
 * carry no readable status. Those are rendered with the copy and imagery
 * from the Federated Containers design so the page can be reviewed whole,
 * and every one of them is collected in PLACEHOLDER below — when the
 * fields exist, that object is the only thing to delete.
 *
 * Wired to real data already: the home's name, its member list, the
 * kinloom count and "Lately in the family".
 */
const PLACEHOLDER = {
  /** No motto/description field on a space today. */
  moral: 'We lean into the hard things, and we keep walking the path we have been given — together.',
  /** No founding date on a space today. */
  since: '2011',
  /** No "featured" concept: the design hand-picks a film for the hero. */
  hero: {
    image: '/design-placeholder/hero-july-fire.jpg',
    caption: 'The July Fire',
    sub: 'Filmed by Eli · Ocracoke, July 2022',
    duration: '2:14',
  },
  /** `status` is write-only in the API, so drafts can't be listed. */
  leftOff: {
    title: 'The Year We Almost Lost the House',
    meta: 'Reflection · draft, 340 words · not published yet',
  },
  moment: {
    image: '/design-placeholder/moment-asa.jpg',
    caption: 'Asa at four, the summer he learned to swim · published to your home',
  },
  /** No featured-quote field on a kinloom today. */
  quote: {
    eyebrow: 'In her own words',
    text: 'Asa answers his grandmother in one language and me in another, and does not notice he is doing it.',
    by: 'Maria',
    meta: 'Born 1987 · 61 kinlooms in her vault',
    link: 'From the kinloom “Two Languages at One Table” →',
  },
  /** No featured-audio concept; the player is presentational here. */
  voice: {
    title: 'Maria, for Asa',
    meta: 'Maria · recorded 2019 · published to your Family Home',
    duration: '4:12',
  },
  band: {
    eyebrow: 'Add to your family’s story',
    head: 'Yours would be the next.',
    sub: 'Every one you add makes the portrait of this home a little more complete.',
    strip: [
      '/design-placeholder/strip-1.jpg',
      '/design-placeholder/strip-2.jpg',
      '/design-placeholder/strip-3.jpg',
      '/design-placeholder/strip-4.jpg',
    ],
    note: '38 photographs, 4 recorded voices, 2 films in this home.',
  },
};

/** Deterministic stand-in for a real waveform. */
const WAVE = Array.from({ length: 30 }, (_, j) => ({
  height: `${20 + Math.round(Math.abs(Math.sin((j + 5) * 1.7)) * 78)}%`,
  played: j < 9,
}));

function Silhouette({ member, idKey }: { member: FamilyMember; idKey: string }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  return (
    <svg viewBox="0 0 80 80" className="home-person__face" aria-label={member.name}>
      <defs><clipPath id={`clip-hp-${idKey}`}><rect width="80" height="80" rx="6" /></clipPath></defs>
      <g clipPath={`url(#clip-hp-${idKey})`}>
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

function LatelyCard({ k }: { k: HomeRecentKinloom }) {
  return (
    <Link href={`/library/${k.ulid}`} className="home-lately__card">
      <span className="home-lately__type">{k.type_label}</span>
      <span className="home-lately__title">{k.title || 'Untitled'}</span>
      {k.excerpt && <span className="home-lately__excerpt">{k.excerpt}</span>}
      <span className="home-lately__by">
        {k.author?.name}
        {k.created_at && <> · {formatKinloomDate(k.created_at)}</>}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const familySpaceId = await requireActiveSpaceId();

  const [data, manage, activeSpace] = await Promise.all([
    getHome(familySpaceId),
    getManageMembers(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const homeName = activeSpace?.name?.trim() || 'Your Family Home';
  const people = manage?.members ?? [];
  const kinloomTotal = data.legacyBankProgress?.total_kinlooms ?? 0;
  const lately = data.recentKinlooms.slice(0, 3);

  return (
    <div className="home-page">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="home-hero">
        <div>
          <p className="eyebrow">Your Family Home</p>
          <h1 className="home-hero__title">{homeName}</h1>
          <p className="home-hero__moral no-api" data-api-scope="in" data-api-note={"IN SCOPE · SOW 2.1\nAPI — Home.motto, nullable text. Already specified as part of the Home profile.\nUI — render from the Home profile; omit the line entirely when empty."}>{PLACEHOLDER.moral}</p>

          <div className="home-stats">
            <div className="home-stat">
              <p className="home-stat__v">{people.length || '—'}</p>
              <p className="home-stat__l">in your home</p>
            </div>
            <div className="home-stat">
              <p className="home-stat__v">{kinloomTotal}</p>
              <p className="home-stat__l">kinlooms here</p>
            </div>
            <div className="home-stat no-api" data-api-scope="in" data-api-note={"IN SCOPE · SOW 2.1\nAPI — Home.established_year, nullable.\nUI — drop the stat when null; never render a dash."}>
              <p className="home-stat__v">{PLACEHOLDER.since}</p>
              <p className="home-stat__l">since</p>
            </div>
          </div>
        </div>

        <div className="home-hero__media no-api" data-api-scope="out" data-api-note={"NOT SCOPED\nAPI — featured film per Home: poster, duration, caption, byline, source kinloom. Absent from SOW 5.1.\nUI — play opens the kinloom.\nDECIDE — add featured content as a change order, derive it automatically (most recent film), or cut."}>
          <div
            role="img"
            aria-label={PLACEHOLDER.hero.caption}
            className="home-hero__img"
            style={{ backgroundImage: `url(${PLACEHOLDER.hero.image})` }}
          />
          <div className="home-hero__overlay">
            <div className="home-hero__play">
              <span className="home-hero__play-btn" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              </span>
              <span className="home-hero__dur">{PLACEHOLDER.hero.duration}</span>
            </div>
            <p className="home-hero__cap">{PLACEHOLDER.hero.caption}</p>
            <p className="home-hero__sub">{PLACEHOLDER.hero.sub}</p>
          </div>
        </div>
      </section>

      {/* ── Your people ──────────────────────────────────────────── */}
      <section className="home-section">
        <div className="home-section__head">
          <p className="home-section__label">Your people</p>
          <Link href="/spaces" className="home-section__link">Your Family Spaces →</Link>
        </div>
        <div className="home-people kmScroll">
          {people.map(m => (
            <Link key={m.member_id} href={`/family/${m.member_id}`} className="home-person">
              <Silhouette member={m} idKey={m.member_id} />
              <span className="home-person__name">{m.name}</span>
              <span className="home-person__sub">
                {m.is_me ? 'You' : m.kin_term || m.role_label || 'Member'}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Where you left off ───────────────────────────────────── */}
      <section className="home-section">
        <div className="home-leftoff no-api" data-api-scope="in" data-api-note={"IN SCOPE · SOW 4.1\nAPI — expose kinloom.status on the READ model — it is write-only today — plus the author’s latest draft. A word count is needed as well.\nUI — resume straight into the composer at the right type; hide the whole bar when there are no drafts."}>
          <p className="home-section__label">Where you left off</p>
          <p className="home-leftoff__title">{PLACEHOLDER.leftOff.title}</p>
          <p className="home-leftoff__meta">{PLACEHOLDER.leftOff.meta}</p>
          <Link href="/vault" className="home-section__link">Continue →</Link>
        </div>
      </section>

      {/* ── A moment, a belief, a voice ──────────────────────────── */}
      <section className="home-section home-triptych">
        <div
          role="img"
          aria-label={PLACEHOLDER.moment.caption}
          className="home-moment no-api" data-api-scope="out" data-api-note={"NOT SCOPED\nAPI — featured photograph per Home: signed media URL and caption. Absent from SOW 5.1.\nUI — link through to its kinloom.\nDECIDE — same call as the hero film."}
          style={{ backgroundImage: `url(${PLACEHOLDER.moment.image})` }}
        />

        <blockquote className="home-quote no-api" data-api-scope="in" data-api-note={"IN SCOPE · SOW 4.1\nAPI — kinloom.featured_quote, plus the author’s birth year and vault total. birth_year already exists on FamilyMember; the total does not.\nUI — link through to the source kinloom; hide the module when no quote is set.\nWATCH OUT — the vault total must be viewer-filtered. A viewer sees only what they can read; the full total appears on a person’s own portrait only."}>
          <p className="home-section__label">{PLACEHOLDER.quote.eyebrow}</p>
          <p className="home-quote__text">“{PLACEHOLDER.quote.text}”</p>
          <footer className="home-quote__foot">
            <span className="home-quote__by">{PLACEHOLDER.quote.by}</span>
            <span className="home-quote__meta">{PLACEHOLDER.quote.meta}</span>
          </footer>
          <Link href="/library" className="home-section__link">{PLACEHOLDER.quote.link}</Link>
        </blockquote>

        <div className="home-voice no-api" data-api-scope="in" data-api-note={"IN SCOPE · SOW 5.1\nAPI — featured recorded voice per Home: signed URL, duration, author, date.\nUI — reuse AudioPlayer.tsx rather than building a second player. The waveform is decorative and may stay static."}>
          <p className="home-section__label">A voice in the family</p>
          <p className="home-voice__title">{PLACEHOLDER.voice.title}</p>
          <p className="home-voice__meta">{PLACEHOLDER.voice.meta}</p>
          <div className="home-voice__player">
            <span className="home-voice__play" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
            </span>
            <span className="home-voice__wave" aria-hidden="true">
              {WAVE.map((w, i) => (
                <span
                  key={i}
                  className={`home-voice__bar${w.played ? ' is-played' : ''}`}
                  style={{ height: w.height }}
                />
              ))}
            </span>
            <span className="home-voice__dur">{PLACEHOLDER.voice.duration}</span>
          </div>
        </div>
      </section>

      {/* ── Lately in the family ─────────────────────────────────── */}
      {lately.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2 className="home-lately__head">Lately in the family</h2>
            <Link href="/library" className="home-section__link">The whole library →</Link>
          </div>
          <div className="home-lately">
            {lately.map(k => <LatelyCard key={k.ulid} k={k} />)}
          </div>
        </section>
      )}

      {/* ── Closing band ─────────────────────────────────────────── */}
      <section className="home-band">
        <div className="home-band__inner">
        <div>
          <p className="home-band__eyebrow">{PLACEHOLDER.band.eyebrow}</p>
          <h2 className="home-band__head">
            {kinloomTotal > 0 ? `${kinloomTotal} kinlooms. ` : ''}{PLACEHOLDER.band.head}
          </h2>
          <p className="home-band__sub">{PLACEHOLDER.band.sub}</p>
          <Link href="/create?from=home" className="home-band__cta">Create a kinloom</Link>
        </div>
        <div>
          <div className="home-band__strip no-api" data-api-scope="out" data-api-note={"NOT SCOPED\nAPI — recent photo media published to this Home. Absent from SOW 5.1.\nUI — signed URLs, each tile linking to its kinloom.\nDECIDE — deriving this from recent Home publications needs no curation screen."}>
            {PLACEHOLDER.band.strip.map(src => (
              <span key={src} className="home-band__tile" style={{ backgroundImage: `url(${src})` }} />
            ))}
            <Link href="/create?from=home" className="home-band__tile home-band__tile--add" aria-label="Create a kinloom">+</Link>
          </div>
          <p className="home-band__note no-api" data-api-scope="out" data-api-note={"NOT SCOPED\nAPI — media tallies per Home: photographs, recorded voices, films. “the Home profile and counts” in SOW 5.1 is ambiguous — confirm before building.\nUI — omit any category that is zero."}>{PLACEHOLDER.band.note}</p>
        </div>
        </div>
      </section>

    </div>
  );
}
