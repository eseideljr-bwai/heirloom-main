import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getMemberProfile } from '../../../../lib/server/queries';
import { ApiError } from '../../../../lib/api';
import type { FamilyMember } from '../../../../lib/server/queries';
import type { LibraryRow } from '../../../../lib/kinloom';
import LegacyChatThread from '../LegacyChatThread';

export const dynamic = 'force-dynamic';

function suggestedQuestions(member: FamilyMember, kinlooms: LibraryRow[]): string[] {
  const firstName = member.name?.split(' ')[0] || 'them';
  const types = new Set(kinlooms.map(k => k.type_slug).filter(Boolean));
  const out: string[] = [];
  if (types.has('story')) out.push(`What's a story from ${firstName}'s life that shaped them?`);
  if (types.has('lesson')) out.push(`What life lessons did ${firstName} most want to pass on?`);
  if (types.has('belief')) out.push(`What did ${firstName} believe was most worth holding onto?`);
  if (types.has('message')) out.push(`What did ${firstName} want their family to remember?`);
  if (out.length < 2) out.push(`What did ${firstName} find most meaningful?`);
  return out.slice(0, 3);
}

export default async function LegacyBankChatPage({ params }: { params: { memberId: string } }) {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  let data;
  try {
    data = await getMemberProfile(familySpaceId, params.memberId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const { member, kinlooms, kinloomCount } = data;
  const firstName = member.name?.split(' ')[0] || 'them';

  return (
    <div className="lb-chat-page">
      <div className="lb-chat-page__back">
        <Link href="/legacy-bank" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          AI Legacy Bank
        </Link>
      </div>

      <div className="lb-chat-page__header">
        <span className="lb-chat-page__avatar" style={{ background: (member.tone || '#a39376') + '28', color: member.tone || '#556b5b' }}>
          {member.initials || member.name?.charAt(0) || '?'}
        </span>
        <div>
          <h1 className="lb-chat-page__title">{member.name}&rsquo;s Legacy</h1>
          <p className="lb-chat-page__sub">
            {member.role_label || member.kin_term || ''}
            {member.deceased ? ' · Passed' : ''}
            {' · '}
            {kinloomCount} kinloom{kinloomCount !== 1 ? 's' : ''} deposited
          </p>
        </div>
      </div>

      <LegacyChatThread
        familySpaceId={familySpaceId}
        conversationId={null}
        mode={member.deceased ? 'sealed' : 'living'}
        subjectMemberId={member.member_id}
        subjectDisplayName={firstName}
        corpusKinlooms={kinlooms}
        suggestedQuestions={suggestedQuestions(member, kinlooms)}
      />
    </div>
  );
}
