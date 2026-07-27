import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireActiveSpaceId } from '../../../../../lib/server/auth';
import { getLegacyBank, getLegacyBankConversation, getMemberProfile } from '../../../../../lib/server/queries';
import { ApiError } from '../../../../../lib/api';
import LegacyChatThread from '../../LegacyChatThread';

export const dynamic = 'force-dynamic';

export default async function LegacyBankHistoryThreadPage({ params }: { params: { conversation: string } }) {
  const familySpaceId = await requireActiveSpaceId();

  let detail;
  try {
    detail = await getLegacyBankConversation(familySpaceId, params.conversation);
  } catch (err) {
    // Both "doesn't exist" and "belongs to another member" render as not-found —
    // history must never confirm the existence of someone else's conversation.
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) notFound();
    throw err;
  }
  const { conversation, messages } = detail;

  let avatar: { tone: string | null; initials: string | null } | null = null;
  let heading: string;
  let sub: string;
  let firstName: string;

  if (conversation.subject_member_id) {
    const { member, kinloomCount } = await getMemberProfile(familySpaceId, conversation.subject_member_id);
    avatar = { tone: member.tone, initials: member.initials };
    heading = `${member.name}’s Legacy`;
    sub = `${member.role_label || member.kin_term || ''}${member.deceased ? ' · Passed' : ''} · ${kinloomCount} kinloom${kinloomCount !== 1 ? 's' : ''} deposited`;
    firstName = member.name?.split(' ')[0] || 'them';
  } else {
    const { progress } = await getLegacyBank(familySpaceId);
    heading = 'Across the family';
    sub = `${progress.total_kinlooms} kinloom${progress.total_kinlooms !== 1 ? 's' : ''} deposited`;
    firstName = 'the family';
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
        {avatar ? (
          <span className="lb-chat-page__avatar" style={{ background: (avatar.tone || '#a39376') + '28', color: avatar.tone || '#556b5b' }}>
            {avatar.initials || heading.charAt(0)}
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
          <h1 className="lb-chat-page__title">{heading}</h1>
          <p className="lb-chat-page__sub">{sub}</p>
        </div>
      </div>

      <LegacyChatThread
        familySpaceId={familySpaceId}
        conversationId={conversation.ulid}
        mode={conversation.mode}
        subjectMemberId={conversation.subject_member_id}
        subjectDisplayName={firstName}
        initialMessages={messages}
      />
    </div>
  );
}
