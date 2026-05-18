import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getMemberProfile } from '../../../../lib/server/queries';
import { ApiError } from '../../../../lib/api';
import LegacyChatClient from './LegacyChatClient';

export const dynamic = 'force-dynamic';

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

      <LegacyChatClient member={member} kinlooms={kinlooms} />
    </div>
  );
}
