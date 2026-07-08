import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getLegacyBank, getLegacyBankConversations } from '../../../../lib/server/queries';
import ConversationRow from '../ConversationRow';

export const dynamic = 'force-dynamic';

export default async function LegacyBankHistoryPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const [conversations, { subjects }] = await Promise.all([
    getLegacyBankConversations(familySpaceId),
    getLegacyBank(familySpaceId),
  ]);
  const subjectsById = Object.fromEntries(
    subjects.map(s => [s.member_id, { tone: s.tone, initials: s.initials }]),
  );

  return (
    <div className="lb-chat-try">
      <div className="lb-chat-try__back">
        <Link href="/legacy-bank" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Back to vault
        </Link>
      </div>

      <p className="eyebrow lb-chat-try__eyebrow">Legacy Bank</p>
      <h1 className="lb-chat-try__title">Every conversation you&rsquo;ve kept.</h1>

      {conversations.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">Nothing kept here yet.</p>
          <p className="empty-card__sub">Start a conversation with any family member and it will appear here.</p>
          <Link href="/legacy-bank/chat" className="btn-primary btn-primary--lg">Try a conversation</Link>
        </div>
      ) : (
        <div className="lb-history-list">
          {conversations.map(c => (
            <ConversationRow
              key={c.ulid}
              conversation={c}
              href={`/legacy-bank/history/${c.ulid}`}
              subjectsById={subjectsById}
              showMessageCount
            />
          ))}
        </div>
      )}
    </div>
  );
}
