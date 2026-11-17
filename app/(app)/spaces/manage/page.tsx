import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { getActiveFamilySpaceId, requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import ManageTabs from '../../../components/ManageTabs';
import NoFamilySpace from '../../../components/NoFamilySpace';
import DataNotice from '../../../components/DataNotice';
import SpaceManageClient from './SpaceManageClient';

export const dynamic = 'force-dynamic';

const meter = (used: number, max: number) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0);

/**
 * Manage Family Space: the Homes in it, who is waiting to join, where each
 * sits on the tree, and who owns it. Every member may open it; the owner also
 * sees pending Homes and invitations and can act. Each button is gated on the
 * flags `GET /family-spaces/{id}/manage` carries (`space.viewer.can_edit`,
 * `can_leave`, `homes[].can_remove`), never on the client's own idea of roles.
 */
export default async function ManageFamilySpacePage() {
  await requireHome();
  const spaceId = await getActiveFamilySpaceId();
  if (!spaceId) return <NoFamilySpace what="Manage Space" />;

  const manage = await serverKinloomApi
    .get('/family-spaces/{familySpace}/manage', { path: { familySpace: spaceId } })
    .catch((err: unknown) => {
      if (err instanceof ApiError) return null;
      throw err;
    });

  const spaceName = manage?.space.name?.trim() || 'this Family Space';
  const isOwner = manage?.space.viewer.can_edit ?? false;
  const slots = manage?.space.home_slots;

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage {spaceName}</p>
      <h1 className="mg-page__title">{spaceName}</h1>
      <ManageTabs scope="space" />

      {manage && (
        <div className="mg-notice">
          <span className="mg-notice__text">
            {manage.space.read_only
              ? 'This Family Space is read-only because it lost its owner. Everything can still be read, but nothing here can change.'
              : isOwner
                ? `You own ${spaceName}. You approve the Homes that join it and declare where each one sits in the tree.`
                : `You are a member of ${spaceName}. You can see which Homes belong and, if you own or co-own your home, take it out.`}
          </span>
        </div>
      )}

      {manage === null && <DataNotice what="this Family Space’s Homes" />}

      {manage && (
        <div className="mg-grid">
          <div>
            <SpaceManageClient spaceId={spaceId} manage={manage} />
          </div>

          <aside className="mg-seats">
            <p className="mg-seats__label">Homes</p>
            <p className="mg-seats__summary">
              {slots ? `${slots.used} of ${slots.max} Homes` : 'Unavailable'}
            </p>
            <div
              className="mg-seats__bar"
              role="img"
              aria-label={slots ? `${slots.used} of ${slots.max} Home slots used` : 'Home slots unavailable'}
            >
              <span className="mg-seats__fill" style={{ width: `${slots ? meter(slots.used, slots.max) : 0}%` }} />
            </div>
            <p className="mg-seats__scope">
              A Family Space connects homes, not people. Each home manages its own
              seats, and nothing here lets you reach inside another home.
            </p>
            {manage.pending && manage.pending.length > 0 && (
              <p className="mg-seats__pending">
                {manage.pending.length} Home{manage.pending.length === 1 ? '' : 's'} waiting for approval.
              </p>
            )}
            {manage.invitations && manage.invitations.length > 0 && (
              <p className="mg-seats__pending">
                {manage.invitations.length} invitation{manage.invitations.length === 1 ? '' : 's'} outstanding.
              </p>
            )}
          </aside>
        </div>
      )}

      <p className="mg-page__foot">
        <Link href="/spaces/tree">See the family tree →</Link>
      </p>
    </div>
  );
}
