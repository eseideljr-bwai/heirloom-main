import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getMemberProfile } from '../../../../lib/server/queries';
import { ApiError } from '../../../../lib/api';
import { formatKinloomDate } from '../../../../lib/kinloom';

export const dynamic = 'force-dynamic';

export default async function MemberProfilePage({ params }: { params: { memberId: string } }) {
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
    <div className="member-page">
      <Link href="/family" className="link-back member-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Family
      </Link>

      <div className="member-page__header">
        <div className="member-page__avatar" style={{ background: (member.tone || '#a39376') + '28', color: member.tone || '#556b5b' }}>
          {member.initials || member.name?.charAt(0) || '?'}
        </div>
        <div className="member-page__heading">
          <h1 className="member-page__name">{member.name}</h1>
          <p className="member-page__role">
            {member.role_label || member.kin_term || ''}
            {member.birth_year ? ` · b. ${member.birth_year}` : ''}
            {member.deceased ? ' · Passed' : ''}
          </p>
        </div>
        <Link href={`/legacy-bank/${member.member_id}`} className="btn-outline member-page__bank">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
          AI Legacy Bank
        </Link>
      </div>

      {member.description && (
        <p className="member-page__bio">{member.description}</p>
      )}

      <h2 className="member-page__h2">Their kinlooms</h2>
      {kinlooms.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">
            {kinloomCount > 0
              ? "Their kinlooms aren't shown here yet."
              : 'No kinlooms shared yet.'}
          </p>
        </div>
      ) : (
        <div className="member-kinlooms">
          {kinlooms.map(k => (
            <Link key={k.ulid} href={`/library/${k.ulid}`} className="kinloom-card">
              <div className="kinloom-card__top">
                {k.type_label && <span className="badge">{k.type_label}</span>}
              </div>
              <h3 className="kinloom-card__title">{k.title || 'Untitled'}</h3>
              {k.excerpt && <p className="kinloom-card__excerpt">{k.excerpt}</p>}
              {k.created_at && <p className="kinloom-card__byline">{formatKinloomDate(k.created_at)}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
