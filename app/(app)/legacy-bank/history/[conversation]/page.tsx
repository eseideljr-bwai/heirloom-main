import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '../../../../../lib/api';
import { conversationTitle, subjectOf } from '../../../../../lib/legacy-bank';
import { requireHome } from '../../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../../lib/server/kinloom-api';
import LegacyChatThread from '../../LegacyChatThread';

export const dynamic = 'force-dynamic';

export default async function LegacyBankHistoryThreadPage({ params }: { params: { conversation: string } }) {
  await requireHome();

  const detail = await serverKinloomApi
    .get('/legacy-bank/conversations/{conversation}', { path: { conversation: params.conversation } })
    .catch((err: unknown) => {
      // A conversation is private to whoever started it: someone else's reads as not found.
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
      throw err;
    });

  const { conversation, data, meta } = detail;
  const subject = subjectOf(conversation);
  const title = conversationTitle(conversation);
  const past = conversation.tense === 'past';
  // The API lists newest first; the thread reads oldest first.
  const messages = [...data].reverse();

  let cannotAsk: string | undefined;
  if (!conversation.can_ask) {
    cannotAsk = subject.isSpace
      ? 'Your Home is no longer in this Family Space, so you can read this conversation but not add to it.'
      : subject.personId == null
        ? `You can no longer see ${subject.name}, so you can read this conversation but not add to it.`
        : `${subject.firstName} has switched their Legacy Bank off, so you can read this conversation but not add to it.`;
  }

  return (
    <div className="lb-chat-page">
      <div className="lb-chat-page__back">
        <Link href="/legacy-bank/history" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          All conversations
        </Link>
      </div>

      <div className="lb-chat-page__header">
        {subject.initials ? (
          <span className="lb-chat-page__avatar" style={{ background: `${subject.tone || '#a39376'}28`, color: subject.tone || '#556b5b' }}>
            {subject.initials}
          </span>
        ) : (
          <span className="lb-chat-page__avatar lb-chat-page__avatar--neutral">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.5" />
            </svg>
          </span>
        )}
        <div>
          <h1 className="lb-chat-page__title">{title}</h1>
          <p className="lb-chat-page__sub">
            {subject.isSpace ? `${subject.name} · Family Space` : subject.isYou ? 'Your own record' : `${subject.name}’s Legacy`}
            {past && !subject.isSpace ? ' · Passed' : ''}
            {` · ${conversation.message_count} message${conversation.message_count === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <LegacyChatThread
        target={
          subject.isSpace && subject.spaceId
            ? { scope: 'space', spaceId: subject.spaceId }
            : { scope: 'person', personId: subject.personId ?? '' }
        }
        conversationId={conversation.id}
        subjectName={subject.isYou ? 'you' : subject.firstName}
        isSpace={subject.isSpace}
        isYou={subject.isYou}
        voice={conversation.voice}
        initialMessages={messages}
        olderPage={meta.last_page > 1 ? 2 : null}
        canAsk={conversation.can_ask}
        cannotAskText={cannotAsk}
      />
    </div>
  );
}
