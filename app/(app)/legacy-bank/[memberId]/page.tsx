import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { starterQuestions } from '../../../../lib/legacy-bank';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import { orNull } from '../../../../lib/server/safe';
import ConversationRow from '../ConversationRow';
import LegacyChatThread from '../LegacyChatThread';

export const dynamic = 'force-dynamic';

/**
 * A person's Legacy Bank (`memberId` is the person id). The scope says what
 * the bank would answer *you* from, so nothing here is guessed: the count,
 * the rows, whether the bank is on, and the voice and tense are all the API's.
 */
export default async function LegacyBankChatPage({ params }: { params: { memberId: string } }) {
  await requireHome();

  const [scope, earlier] = await Promise.all([
    serverKinloomApi
      .get('/people/{member}/legacy-bank/scope', { path: { member: params.memberId } })
      .catch((err: unknown) => {
        // Someone you can't see is the same answer as someone who doesn't exist.
        if (err instanceof ApiError && err.status === 404) notFound();
        throw err;
      }),
    orNull(serverKinloomApi.get('/legacy-bank/conversations', { query: { person: params.memberId, per_page: 3 } })),
  ]);

  const subject = scope.subject;
  if (!subject) notFound();
  const isMe = subject.is_you;
  const firstName = subject.name.split(' ')[0] || 'them';
  const past = scope.tense === 'past';
  const prior = (earlier?.data ?? []).filter(c => c.last_message_at);

  return (
    <div className="lb-page2">
      <Link href={`/portrait/${subject.id}`} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {isMe ? 'My Legacy Portrait' : `${subject.name}’s Legacy Portrait`}
      </Link>

      <div className="lb-head">
        <span
          className="lb-head__avatar"
          style={{ background: `${subject.tone || '#a39376'}28`, color: subject.tone || '#556b5b' }}
          aria-hidden="true"
        >
          {subject.initials || subject.name.charAt(0)}
        </span>
        <div className="lb-head__text">
          <p className="eyebrow">AI Legacy Bank</p>
          <h1 className="lb-head__title">
            {isMe ? 'Your own record' : `${subject.name}’s Legacy`}
          </h1>
        </div>
      </div>

      <p className="lb-lead">
        {isMe
          ? 'Answers come only from the kinlooms you created, private ones included. No invented facts. No impersonation.'
          : scope.voice === 'first_person'
            ? `${firstName} chose to have answers spoken in their own words, drawn only from what they kept. Nothing is made up.`
            : `Answers come only from what ${firstName} ${past ? 'kept' : 'chose to keep'}. Nothing is inferred, and nothing speaks in ${firstName}’s voice.`}
      </p>

      <div className="lb-grid">
        {scope.enabled ? (
          <LegacyChatThread
            target={{ scope: 'person', personId: subject.id }}
            conversationId={null}
            subjectName={isMe ? 'you' : firstName}
            isYou={isMe}
            voice={scope.voice}
            suggestedQuestions={scope.kinlooms > 0 ? starterQuestions(firstName, isMe) : undefined}
            intro={
              scope.kinlooms === 0
                ? isMe
                  ? 'You haven’t written anything yet. Create a kinloom, and your record starts here.'
                  : `There’s nothing of ${firstName}’s that you can read yet, so there’s nothing to draw on.`
                : undefined
            }
          />
        ) : (
          <div className="lb-chat">
            <div className="lb-chat__empty">
              <p className="lb-chat__empty-title">{firstName} has switched their Legacy Bank off.</p>
              <p className="lb-chat__empty-sub">
                It can’t answer questions about them right now. You can still read what they’ve published.
              </p>
            </div>
          </div>
        )}

        <aside className="lb-ground">
          <p className="lb-ground__label">What it is grounded in</p>
          <p className="lb-ground__count">
            {scope.kinlooms} kinloom{scope.kinlooms === 1 ? '' : 's'}
          </p>
          <p className="lb-ground__sub">
            {isMe
              ? 'Everything in your vault, including what nobody else can read.'
              : `Only the kinlooms ${firstName} published where you can read them.`}
          </p>

          {scope.rows.length > 0 && (
            <div className="lb-ground__list">
              {scope.rows.map(r => (
                <div key={r.kind} className="lb-ground__item">
                  <span className="lb-ground__type">{r.kinlooms}</span>
                  <span className="lb-ground__title">{r.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="lb-ground__links">
            <Link href={`/legacy-bank/${subject.id}/scope`}>
              {isMe ? 'See your own scope →' : 'See what you can read →'}
            </Link>
            <Link href={`/portrait/${subject.id}`}>
              {isMe ? 'My Legacy Portrait →' : `${firstName}’s Legacy Portrait →`}
            </Link>
            {isMe && <Link href="/vault">Everything in My Vault →</Link>}
          </div>
        </aside>
      </div>

      {prior.length > 0 && (
        <div className="lb-section lb-section--after">
          <div className="lb-section__head">
            <p className="eyebrow">Earlier conversations</p>
            <Link href="/legacy-bank/history" className="lb-section__hint lb-section__hint--link">View all →</Link>
          </div>
          <div className="lb-history-list">
            {prior.map(c => (
              <ConversationRow key={c.id} conversation={c} href={`/legacy-bank/history/${c.id}`} showMessageCount />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
