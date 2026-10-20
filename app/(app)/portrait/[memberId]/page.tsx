import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import {
  getHome,
  getMemberProfile,
  type FamilyMember,
} from '../../../../lib/server/queries';
import { formatKinloomDate, type LibraryRow } from '../../../../lib/kinloom';
import { suggestedQuestions } from '../../../../lib/legacy-bank';

export const dynamic = 'force-dynamic';

/**
 * Legacy Portrait — one person, and the work of theirs you can read.
 *
 * Two modules have no API behind them and carry design content, marked
 * with `no-api` the same way the Home page does:
 *   • the featured quote (no `featured_quote` field on a kinloom)
 *   • the "you can see N of M" line (nothing computes a viewer-filtered
 *     count; the Social Graph requires one)
 */
const PLACEHOLDER = {
  quote: 'You can love a place from a distance and still be the one who answers the phone.',
  quoteSource: 'On Staying Close Without Moving Back',
};

function PortraitFace({ member }: { member: FamilyMember }) {
  const gender = member.gender || 'n';
  const tone = member.tone || '#a39376';
  return (
    <svg viewBox="0 0 80 100" className="portrait__face" aria-label={member.name}>
      <defs><clipPath id="clip-portrait"><rect width="80" height="100" rx="5" /></clipPath></defs>
      <g clipPath="url(#clip-portrait)">
        <rect width="80" height="100" fill={`${tone}22`} />
        <rect y="62" width="80" height="38" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="44" rx="17" ry="19" fill={tone} opacity="0.38" />}
        <path d="M 4 100 C 4 76, 20 66, 40 66 C 60 66, 76 76, 76 100 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="42" rx="13" ry={gender === 'f' ? 12 : 11} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 27 38 Q 40 25, 53 38 L 53 42 Q 40 35, 27 42 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 27 40 Q 27 27, 40 25 Q 53 27, 53 40 L 53 49 Q 51 40, 40 40 Q 29 40, 27 49 Z" fill={tone} opacity="0.45" />}
      </g>
    </svg>
  );
}

function KinloomEntry({ row }: { row: LibraryRow }) {
  return (
    <Link href={`/library/${row.ulid}`} className="portrait-kin">
      <span className="portrait-kin__type">{row.type_label}</span>
      <span className="portrait-kin__title">{row.title || 'Untitled'}</span>
      {row.created_at && (
        <span className="portrait-kin__date">{formatKinloomDate(row.created_at)}</span>
      )}
    </Link>
  );
}

export default async function PortraitPage({ params }: { params: { memberId: string } }) {
  const familySpaceId = await requireActiveSpaceId();

  let profile;
  try {
    profile = await getMemberProfile(familySpaceId, params.memberId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const [home, activeSpace] = await Promise.all([
    getHome(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const { member, kinloomCount, kinlooms } = profile;
  const myMemberId = home?.userSummary?.member_id || activeSpace?.member_id || null;
  const isMe = myMemberId != null
    && String(myMemberId).toLowerCase() === String(member.member_id).toLowerCase();

  const firstName = member.name?.split(' ')[0] || member.name;
  // The band is a taste of the vault, not the vault: the three most
  // recent, newest first, with the full set a click away.
  const recent = [...kinlooms]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 3);
  const questions = suggestedQuestions(member, kinlooms);
  const relation = member.kin_term || member.role_label || null;
  const line = [relation, member.birth_year ? `Born ${member.birth_year}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="portrait-page">
      <Link href="/home" className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to My Home
      </Link>

      <section className="portrait-head">
        <div className="portrait__frame">
          <PortraitFace member={member} />
        </div>

        <div>
          <div className="portrait__eyebrow-row">
            <p className="eyebrow">Legacy Portrait</p>
            {!member.deceased && <span className="portrait__chip">Kinloom member</span>}
          </div>

          <h1 className="portrait__name">{member.name}</h1>
          {line && <p className="portrait__line">{line}</p>}

          <blockquote
            className="portrait__quote no-api"
            data-api-scope="in"
            data-api-note={"GET /people/{personId} → PortraitPage\n→ quote · KinloomQuoteCard | null\nChosen by the API, not by you: the most recent kinloom of theirs you can read that carries a featured_quote. Text: quote.featured_quote. Attribution: quote.author. Link: /kinlooms/{quote.id}. Hide the block when null."}
          >
            “{PLACEHOLDER.quote}”
            <footer className="portrait__quote-src">
              From the kinloom “{PLACEHOLDER.quoteSource}” →
            </footer>
          </blockquote>

          <div
            className="portrait__stats no-api"
            data-api-scope="in"
            data-api-note={"GET /people/{personId} → PortraitPage\n→ counts · { kinlooms, by_type, private }   (private is null unless it is your own portrait)\nAlso: person.birth_year, description, date_of_death, home · HomeRef.\nThe design's three stats (written / in Home / in Spaces) come from the scope rows: GET /people/{personId}/legacy-bank/scope → rows[].kind."}
          >
            <div>
              <p className="portrait__stat-v">{kinloomCount}</p>
              <p className="portrait__stat-l">kinlooms</p>
            </div>
            {member.birth_year && (
              <div>
                <p className="portrait__stat-v">{member.birth_year}</p>
                <p className="portrait__stat-l">born</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="portrait-words">
        <div className="portrait-words__inner">
          <div className="portrait-words__head">
            <p className="eyebrow portrait-words__label">
              {isMe ? 'In your own words' : `In ${firstName}’s own words`}
            </p>
            {isMe && kinloomCount > recent.length && (
              <Link href="/vault" className="portrait-words__all">
                All {kinloomCount} in My Vault →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="empty-card">
              <p className="empty-card__text">Nothing here you can read yet.</p>
            </div>
          ) : (
            <>
              <div className="portrait-kins">
                {recent.map(row => <KinloomEntry key={row.ulid} row={row} />)}
              </div>
              {isMe && (
                <Link href="/vault" className="portrait-words__cta">
                  Open My Vault →
                </Link>
              )}
            </>
          )}
        </div>
      </section>

      <section className="portrait-section">
        <div className="portrait-bank">
          <div>
            <p className="eyebrow">AI Legacy Bank</p>
            <h2 className="portrait-bank__title">
              {isMe ? 'Ask your own Legacy Bank.' : `Ask ${firstName} a question.`}
            </h2>
            <p className="portrait-bank__body">
              Grounded in {isMe ? 'your' : 'their'} kinlooms and nothing else. If an
              answer isn’t in one, Kinloom says so rather than inventing it.
            </p>

            <p
              className="portrait-bank__scope no-api"
            data-api-scope="in"
            data-api-note={"GET /people/{personId}/legacy-bank/scope → LegacyBankScope\n→ kinlooms · integer, the whole grounding set\n→ rows[] · { kind: home | spaces | vault | space, label, kinlooms }\n“You can see N of M” comes straight from rows vs kinlooms — no client arithmetic. Also returns enabled (a person can switch their Bank off), voice and tense."}
            >
              Grounded in all {kinloomCount} kinlooms {isMe ? 'you' : firstName} created.
              {!isMe && <> You can see {kinlooms.length} of them.</>}
            </p>

            <div className="portrait-bank__actions">
              <Link href={`/legacy-bank/${member.member_id}`} className="portrait-bank__cta">
                {isMe ? 'Open My Legacy Bank →' : `Open ${firstName}’s Legacy Bank →`}
              </Link>
              <Link href={`/legacy-bank/${member.member_id}/scope`} className="portrait-bank__scope-link">
                {isMe ? 'See your own scope →' : 'See what you can read →'}
              </Link>
            </div>
          </div>

          <div className="portrait-bank__asks">
            {questions.map(q => (
              <Link
                key={q}
                href={`/legacy-bank/${member.member_id}`}
                className="portrait-bank__ask"
              >
                {q}
              </Link>
            ))}
            <p className="portrait-bank__grounded">
              Grounded responses only. If it is not in a kinloom, Kinloom says so.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
