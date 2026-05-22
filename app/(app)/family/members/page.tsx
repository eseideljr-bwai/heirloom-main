import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getManageMembers } from '../../../../lib/server/queries';
import MembersClient from './MembersClient';

export const dynamic = 'force-dynamic';

export default async function FamilyMembersPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const { members, pending } = await getManageMembers(familySpaceId);

  return (
    <div className="manage-page">
      <Link href="/family" className="link-back manage-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Family
      </Link>

      <MembersClient
        familySpaceId={familySpaceId}
        members={members}
        pending={pending}
      />
    </div>
  );
}
