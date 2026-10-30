import Link from 'next/link';
import { requireHome } from '../../../lib/server/auth';
import { getFamilyHome } from '../../../lib/server/queries';
import { formatKinloomDate, isVideoMedia, type PersonOrNameOnly } from '../../../lib/kinloom';
import type { components } from '../../../lib/api-schema/typed';
import { orNull } from '../../../lib/server/safe';
import DataNotice from '../../components/DataNotice';
import HomeVoicePlayer from './HomeVoicePlayer';

export const dynamic = 'force-dynamic';

type KinloomCard = components['schemas']['KinloomCard'];

/**
 * My Home: the Family Home's own page.
 *
 * Everything on it comes from `GET /family-homes/{id}`: the profile, the
 * counts, who is in the home, where you left off and the featured block. The
 * API picks the hero, quote, voice and "lately" cards (the owner's picks, else
 * the automatic choice), so every member sees the same block. A module the API
 * has nothing for is left out rather than faked.
 */

const nameOf = (p: PersonOrNameOnly) => p.name;

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function clock(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Open a card through the Home's room so comments land in this Home's thread. */
const cardHref = (id: string, homeId: string) => `/library/${id}?room=home:${homeId}`;

function Silhouette({ member, idKey }: { member: { name: string; gender?: string; tone?: string }; idKey: string }) {
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

function LatelyCard({ k, homeId }: { k: KinloomCard; homeId: string }) {
  return (
    <Link href={cardHref(k.id, homeId)} className="home-lately__card">
      <span className="home-lately__type">{k.type.label}</span>
      <span className="home-lately__title">{k.title || 'Untitled'}</span>
      {k.excerpt && <span className="home-lately__excerpt">{k.excerpt}</span>}
      <span className="home-lately__by">
        {nameOf(k.author)}
        {k.created_at && <> · {formatKinloomDate(k.created_at)}</>}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const { homeId, home: homeRef } = await requireHome();
  const home = await orNull(getFamilyHome(homeId));

  const homeName = home?.name?.trim() || homeRef.name || 'Your Family Home';
  const people = home?.people ?? [];
  const stats = home?.stats;
  const featured = home?.featured;
  const hero = featured?.hero ?? null;
  const quote = featured?.quote ?? null;
  const voice = featured?.voice ?? null;
  const lately = featured?.lately ?? [];
  const leftOff = home?.where_you_left_off ?? null;
  const kinloomTotal = stats?.kinlooms_published_here ?? 0;
  const established = stats?.established_year ?? home?.established_year ?? null;

  const heroMedia = hero?.media ?? null;
  const heroIsVideo = heroMedia ? isVideoMedia(heroMedia) : false;
  const heroIsImage = heroMedia?.type === 'image';
  const heroDuration = clock(heroMedia?.duration_seconds);

  const counts = home?.media_counts;
  const countParts = counts
    ? [
        counts.photos > 0 ? plural(counts.photos, 'photograph', 'photographs') : null,
        counts.recorded_voices > 0 ? plural(counts.recorded_voices, 'recorded voice', 'recorded voices') : null,
        counts.films > 0 ? plural(counts.films, 'film', 'films') : null,
      ].filter((x): x is string => !!x)
    : [];

  const triptychCount = (quote ? 1 : 0) + (voice ? 1 : 0);

  return (
    <div className="home-page">

      {home === null && (
        <section className="home-section">
          <DataNotice what="this home’s details" />
        </section>
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className={`home-hero${hero ? '' : ' home-hero--solo'}`}>
        <div>
          <p className="eyebrow">Your Family Home</p>
          <h1 className="home-hero__title">{homeName}</h1>
          {home?.motto && <p className="home-hero__moral">{home.motto}</p>}

          {home && (
            <div className="home-stats">
              <div className="home-stat">
                <p className="home-stat__v">{stats?.members ?? people.length}</p>
                <p className="home-stat__l">in your home</p>
              </div>
              <div className="home-stat">
                <p className="home-stat__v">{kinloomTotal}</p>
                <p className="home-stat__l">kinlooms here</p>
              </div>
              {established && (
                <div className="home-stat">
                  <p className="home-stat__v">{established}</p>
                  <p className="home-stat__l">since</p>
                </div>
              )}
            </div>
          )}
        </div>

        {hero && (
          <Link href={cardHref(hero.id, homeId)} className="home-hero__media home-hero__media--link">
            {heroIsVideo && heroMedia ? (
              // The first frame stands in for a poster; nothing plays until the kinloom opens.
              <video
                className="home-hero__img"
                src={`${heroMedia.url}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                aria-label={hero.title}
                style={{ objectFit: 'cover' }}
              />
            ) : heroIsImage && heroMedia ? (
              <div
                role="img"
                aria-label={hero.title}
                className="home-hero__img"
                style={{ backgroundImage: `url(${heroMedia.url})` }}
              />
            ) : (
              <div className="home-hero__img home-hero__img--text">{hero.title}</div>
            )}
            <div className="home-hero__overlay">
              {heroIsVideo && (
                <div className="home-hero__play">
                  <span className="home-hero__play-btn" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                  </span>
                  {heroDuration && <span className="home-hero__dur">{heroDuration}</span>}
                </div>
              )}
              <p className="home-hero__cap">{hero.title}</p>
              <p className="home-hero__sub">
                {nameOf(hero.author)}
                {hero.occurred_label ? ` · ${hero.occurred_label}` : ''}
              </p>
            </div>
          </Link>
        )}
      </section>

      {/* ── Your people ──────────────────────────────────────────── */}
      <section className="home-section">
        <div className="home-section__head">
          <p className="home-section__label">Your people</p>
          <Link href="/spaces" className="home-section__link">Your Family Spaces →</Link>
        </div>
        <div className="home-people kmScroll">
          {people.map(m => (
            <Link key={m.id} href={`/portrait/${m.id}`} className="home-person">
              <Silhouette member={m} idKey={m.id} />
              <span className="home-person__name">{m.name}</span>
              <span className="home-person__sub">{m.label || 'Member'}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Where you left off ───────────────────────────────────── */}
      {leftOff && (
        <section className="home-section">
          <div className="home-leftoff">
            <p className="home-section__label">Where you left off</p>
            <p className="home-leftoff__title">{leftOff.title || 'Untitled'}</p>
            <p className="home-leftoff__meta">{leftOff.type.label} · draft · not published yet</p>
            <Link href={`/library/${leftOff.id}`} className="home-section__link">Continue →</Link>
          </div>
        </section>
      )}

      {/* ── A belief, a voice ────────────────────────────────────── */}
      {triptychCount > 0 && (
        <section className={`home-section home-triptych${triptychCount === 2 ? ' home-triptych--2' : ' home-triptych--1'}`}>
          {quote && (
            <blockquote className="home-quote">
              <p className="home-section__label">In their own words</p>
              <p className="home-quote__text">“{quote.featured_quote}”</p>
              <footer className="home-quote__foot">
                <span className="home-quote__by">{nameOf(quote.author)}</span>
                {'id' in quote.author && (quote.author.label || quote.author.birth_year) && (
                  <span className="home-quote__meta">
                    {[quote.author.label, quote.author.birth_year ? `Born ${quote.author.birth_year}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </footer>
              <Link href={cardHref(quote.id, homeId)} className="home-section__link">
                From the kinloom “{quote.title}” →
              </Link>
            </blockquote>
          )}

          {voice?.media && (
            <div className="home-voice">
              <p className="home-section__label">A voice in the family</p>
              <p className="home-voice__title">{voice.title}</p>
              <p className="home-voice__meta">
                {nameOf(voice.author)} · {formatKinloomDate(voice.created_at)} · published to your Family Home
              </p>
              <HomeVoicePlayer
                src={voice.media.url}
                durationSeconds={voice.media.duration_seconds}
                label={voice.title}
              />
            </div>
          )}
        </section>
      )}

      {/* ── Lately in the family ─────────────────────────────────── */}
      {lately.length > 0 && (
        <section className="home-section">
          <div className="home-section__head">
            <h2 className="home-lately__head">Lately in the family</h2>
            <Link href="/library" className="home-section__link">The whole library →</Link>
          </div>
          <div className="home-lately">
            {lately.map(k => <LatelyCard key={k.id} k={k} homeId={homeId} />)}
          </div>
        </section>
      )}

      {/* ── Closing band ─────────────────────────────────────────── */}
      <section className="home-band">
        <div className="home-band__inner">
        <div>
          <p className="home-band__eyebrow">Add to your family’s story</p>
          <h2 className="home-band__head">
            {kinloomTotal > 0 ? `${plural(kinloomTotal, 'kinloom', 'kinlooms')}. ` : ''}Yours would be the next.
          </h2>
          <p className="home-band__sub">Every one you add makes the portrait of this home a little more complete.</p>
          <Link href="/create?from=home" className="home-band__cta">Create a kinloom</Link>
        </div>
        <div>
          <div className="home-band__strip">
            <Link href="/create?from=home" className="home-band__tile home-band__tile--add" aria-label="Create a kinloom">+</Link>
          </div>
          {countParts.length > 0 && (
            <p className="home-band__note">{countParts.join(', ')} in this home.</p>
          )}
        </div>
        </div>
      </section>

    </div>
  );
}
