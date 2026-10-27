import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { formatKinloomDate } from '../../../../lib/kinloom';
import { starterQuestions } from '../../../../lib/legacy-bank';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { parsePageParam } from '../../../../lib/pagination';
import type { components } from '../../../../lib/api-schema/typed';
import Pagination from '../../../components/Pagination';
import MemorializationNotice from '../MemorializationNotice';

export const dynamic = 'force-dynamic';

type Person = components['schemas']['PersonCard'];
type Card = components['schemas']['KinloomCard'];

const PAGE_SIZE = 6;

/**
 * Legacy Portrait: one person, and the work of theirs you can read.
 *
 * Everything on it is the API's: the quote it chose, the counts of what you
 * can read (never "N of M": nobody learns how many you can't), their Home,
 * and whether to offer their Legacy Bank. `memberId` is the person id.
 */
function PortraitFace({ member }: { member: Person }) {
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

function KinloomEntry({ row }: { row: Card }) {
  return (
    <Link href={`/library/${row.id}`} className="portrait-kin">
      {row.thumbnail_url && (
        <img className="portrait-kin__img" src={row.thumbnail_url} alt="" loading="lazy" decoding="async" />
      )}
      <span className="portrait-kin__type">{row.type.label}</span>
      <span className="portrait-kin__title">{row.title || 'Untitled'}</span>
      {row.created_at && (
        <span className="portrait-kin__date">{formatKinloomDate(row.created_at)}</span>
      )}
    </Link>
  );
}

export default async function PortraitPage({
  params,
  searchParams,
}: {
  params: { memberId: string };
  searchParams: { page?: string };
}) {
  await requireHome();
  const requested = parsePageParam(searchParams.page);

  const portrait = await serverKinloomApi
    .get('/people/{member}', {
      path: { member: params.memberId },
      query: { page: requested, per_page: PAGE_SIZE },
    })
    .catch((err: unknown) => {
      // Someone you can't see is the same answer as someone who doesn't exist.
      if (err instanceof ApiError && err.status === 404) notFound();
      throw err;
    });

  const { person, counts, quote, memorialization, home, data: kinlooms, meta } = portrait;
  const isMe = person.is_you;
  const firstName = person.name.split(' ')[0] || person.name;
  const passed = person.deceased;
  const familyProfile = !person.has_account;
  const shared = counts.private == null ? null : counts.kinlooms - counts.private;
  const questions = starterQuestions(firstName, isMe);
  const line = [
    isMe ? 'You' : person.label,
    person.birth_year ? `Born ${person.birth_year}` : null,
    passed && portrait.date_of_death ? `Died ${portrait.date_of_death}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="portrait-page">
      <Link href="/home" className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to My Home
      </Link>

      {memorialization && (
        <MemorializationNotice
          personId={person.id}
          name={person.name}
          isYou={isMe}
          requestedBy={'id' in memorialization.requested_by && memorialization.requested_by.is_you ? 'You' : memorialization.requested_by.name}
          effectiveAt={memorialization.effective_at}
          canCancel={memorialization.can_cancel}
        />
      )}

      <section className="portrait-head">
        <div className="portrait__frame">
          <PortraitFace member={person} />
        </div>

        <div>
          <div className="portrait__eyebrow-row">
            <p className="eyebrow">Legacy Portrait</p>
            {passed ? (
              <span className="portrait__chip">Passed</span>
            ) : familyProfile ? (
              <span className="portrait__chip">Family profile</span>
            ) : (
              <span className="portrait__chip">Kinloom member</span>
            )}
          </div>

          <h1 className="portrait__name">{person.name}</h1>
          {line && <p className="portrait__line">{line}</p>}
          {home && <p className="portrait__line portrait__line--home">{home.name}</p>}
          {portrait.description && <p className="portrait__about">{portrait.description}</p>}

          {quote && (
            <blockquote className="portrait__quote">
              “{quote.featured_quote}”
              <footer className="portrait__quote-src">
                <Link href={`/library/${quote.id}`}>From the kinloom “{quote.title || 'Untitled'}” →</Link>
              </footer>
            </blockquote>
          )}

          <div className="portrait__stats">
            <div>
              <p className="portrait__stat-v">{counts.kinlooms}</p>
              <p className="portrait__stat-l">{isMe ? 'written' : 'you can read'}</p>
            </div>
            {shared != null && (
              <>
                <div>
                  <p className="portrait__stat-v">{shared}</p>
                  <p className="portrait__stat-l">shared</p>
                </div>
                <div>
                  <p className="portrait__stat-v">{counts.private}</p>
                  <p className="portrait__stat-l">only you</p>
                </div>
              </>
            )}
            {person.birth_year && (
              <div>
                <p className="portrait__stat-v">{person.birth_year}</p>
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
            {isMe && counts.kinlooms > 0 && (
              <Link href="/vault" className="portrait-words__all">
                Open My Vault →
              </Link>
            )}
          </div>

          {kinlooms.length === 0 ? (
            <div className="empty-card">
              <p className="empty-card__text">
                {familyProfile
                  ? `${firstName} doesn’t have an account, so there’s nothing written here.`
                  : isMe
                    ? 'You haven’t written anything yet.'
                    : 'Nothing here you can read yet.'}
              </p>
              {isMe && (
                <Link href="/create" className="btn-primary btn-primary--lg">Create a kinloom</Link>
              )}
            </div>
          ) : (
            <>
              <div className="portrait-kins">
                {kinlooms.map(row => <KinloomEntry key={row.id} row={row} />)}
              </div>
              <Pagination
                page={meta.page}
                totalPages={meta.last_page}
                basePath={`/portrait/${person.id}`}
                totalItems={meta.total}
                pageSize={PAGE_SIZE}
                label="Kinlooms"
              />
            </>
          )}
        </div>
      </section>

      {portrait.can_ask_legacy_bank && (
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

              <p className="portrait-bank__scope">
                {isMe
                  ? `Grounded in all ${counts.kinlooms} kinlooms you wrote, private ones included.`
                  : `Grounded in the ${counts.kinlooms} kinloom${counts.kinlooms === 1 ? '' : 's'} ${firstName} published where you can read them.`}
              </p>

              <div className="portrait-bank__actions">
                <Link href={`/legacy-bank/${person.id}`} className="portrait-bank__cta">
                  {isMe ? 'Open My Legacy Bank →' : `Open ${firstName}’s Legacy Bank →`}
                </Link>
                <Link href={`/legacy-bank/${person.id}/scope`} className="portrait-bank__scope-link">
                  {isMe ? 'See your own scope →' : 'See what you can read →'}
                </Link>
              </div>
            </div>

            <div className="portrait-bank__asks">
              {questions.map(q => (
                <Link key={q} href={`/legacy-bank/${person.id}`} className="portrait-bank__ask">
                  {q}
                </Link>
              ))}
              <p className="portrait-bank__grounded">
                Grounded responses only. If it is not in a kinloom, Kinloom says so.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
