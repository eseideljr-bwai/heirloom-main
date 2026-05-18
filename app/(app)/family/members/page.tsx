import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getManageMembers } from '../../../../lib/server/queries';

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

      <div className="manage-page__header">
        <div>
          <p className="eyebrow manage-page__eyebrow">Members</p>
          <h1 className="manage-page__title">Manage your family space.</h1>
        </div>
        {/* Invite mutation lands in Epic 4. */}
        <button type="button" className="btn-primary" disabled>+ Invite member</button>
      </div>

      <h2 className="manage-page__h2">Members ({members.length})</h2>
      {members.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">No family members yet.</p>
          <p className="empty-card__sub">Your family space is invite-only. Invite the people you want to include.</p>
        </div>
      ) : (
        <ul className="manage-list">
          {members.map(m => (
            <li key={m.member_id} className="manage-list__row">
              <span className="manage-list__avatar" style={{ background: (m.tone || '#a39376') + '28', color: m.tone || '#556b5b' }}>
                {m.initials || m.name?.charAt(0) || '?'}
              </span>
              <div className="manage-list__body">
                <p className="manage-list__name">{m.name}{m.is_me ? ' · You' : ''}</p>
                <p className="manage-list__sub">
                  {m.role_label || m.kin_term || ''}
                  {m.deceased ? ' · Passed' : ''}
                </p>
              </div>
              <Link href={`/family/${m.member_id}`} className="manage-list__link">View</Link>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="manage-page__h2 manage-page__h2--spaced">Pending invitations ({pending.length})</h2>
          <ul className="manage-list">
            {pending.map(inv => (
              <li key={inv.ulid} className="manage-list__row">
                <span className="manage-list__avatar manage-list__avatar--pending">@</span>
                <div className="manage-list__body">
                  <p className="manage-list__name">{inv.email}</p>
                  <p className="manage-list__sub">
                    {inv.role_label || 'Invited'}
                    {inv.invited_at ? ` · sent ${inv.invited_at}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
