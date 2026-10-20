import Link from 'next/link';
import { getActiveSpace, getCurrentUser, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getManageMembers } from '../../../../lib/server/queries';
import { isOwnerOfSpace } from '../../../../lib/auth';
import { orNull } from '../../../../lib/server/safe';
import ManageTabs from '../../../components/ManageTabs';
import MembersClient from '../../family/members/MembersClient';

export const dynamic = 'force-dynamic';

/**
 * Manage Family — the people in this Home, their roles, and seat usage.
 *
 * All the invite / add / edit / remove behaviour is MembersClient, reused
 * untouched from the legacy /family/members route; this page supplies the
 * design's shell around it.
 *
 * Seats are the one thing with no API: nothing exposes a limit, so the
 * used count is real and the allowance is marked as unsupported rather
 * than invented.
 */
export default async function ManageFamilyPage() {
  const familySpaceId = await requireActiveSpaceId();

  // This route is refused for some memberships, so a failure here has to
  // degrade to an explanation rather than take the page down.
  const [manage, user, activeSpace] = await Promise.all([
    orNull(getManageMembers(familySpaceId)),
    getCurrentUser(),
    getActiveSpace(),
  ]);

  const isOwner = isOwnerOfSpace(user, familySpaceId);
  const homeName = activeSpace?.name?.trim() || 'Your Family Home';
  const members = manage?.members ?? [];
  const pending = manage?.pending ?? [];
  const withAccounts = members.length;

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage your Family Home</p>
      <h1 className="mg-page__title">{homeName}</h1>
      <ManageTabs />

      <div className="mg-notice">
        <span className="mg-notice__text">
          {isOwner
            ? 'You own this home. Anyone you invite can read everything published here, and publish their own.'
            : 'You are a member of this home. Only owners can invite, add or remove people.'}
        </span>
      </div>

      <div className="mg-grid">
        <div>
          {manage === null ? (
            <div className="mg-card">
              <div className="mg-card__head">
                <span className="mg-card__title">Members</span>
              </div>
              <p className="mg-card__empty">
                This family space wouldn’t return its member list. That usually
                means the account isn’t currently permitted to manage it — either
                it belongs to someone else, or the membership needs repairing on
                the server. Nothing you have written is affected.
              </p>
            </div>
          ) : (
            <MembersClient
              familySpaceId={familySpaceId}
              members={members}
              pending={pending}
              isOwner={isOwner}
            />
          )}
        </div>

        <aside className="mg-seats">
          <p className="mg-seats__label">Seats</p>
          <p className="mg-seats__summary">
            {manage === null
              ? 'Unavailable'
              : `${withAccounts} seat${withAccounts === 1 ? '' : 's'} used`}
          </p>

          <div
            className="no-api"
              data-api-scope="in"
              data-api-note={"GET /family-homes/{homeId}/manage\n→ seats · Meter { used, max }   (people without accounts: profiles · Meter)\nGives the bar its denominator. Also returns people[], invitations[], viewer, read_only — which replaces GET /family-spaces/{id}/manage-members."}
          >
            <div className="mg-seats__bar" role="img" aria-label="Seat allowance unavailable">
              <span className="mg-seats__fill" style={{ width: '0%' }} />
            </div>
            <p className="mg-seats__note">
              Not wired yet — the allowance comes from <code>seats.max</code> on
              the Phase 3 manage endpoint, which this page doesn’t read.
            </p>
          </div>

          <p className="mg-seats__scope">
            Seats count accounts. Someone who appears in this home without an
            account — a child, a relative who has passed — uses none.
          </p>

          {pending.length > 0 && (
            <p className="mg-seats__pending">
              {pending.length} invitation{pending.length === 1 ? '' : 's'} outstanding.
            </p>
          )}
        </aside>
      </div>

      <p className="mg-page__foot">
        Looking for the wider family? <Link href="/spaces">Your Family Spaces →</Link>
      </p>
    </div>
  );
}
