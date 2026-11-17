'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { canUpgradeToCreateSpace, createSpaceBlockedReason } from '../../lib/can-create-space';
import UpgradeToFamily from './UpgradeToFamily';

/**
 * "Create a Family Space", shown where a Home that is in no Space lands.
 * Offered only when `GET /me` says `can_create_space`; otherwise it says why
 * not, from the plan and the person's role in their Home.
 */
export default function CreateSpaceCard() {
  const { user } = useAuth();
  if (!user) return null;

  const blocked = createSpaceBlockedReason(user);
  if (blocked) {
    return (
      <>
        <p className="empty-card__sub">{blocked}</p>
        {canUpgradeToCreateSpace(user) && <UpgradeToFamily />}
      </>
    );
  }

  return (
    <>
      <p className="empty-card__sub" style={{ margin: '20px 0 12px' }}>
        Or start your own. Your Family Home becomes its first Home, and you invite the others.
      </p>
      <Link href="/spaces/new" className="btn-save" style={{ display: 'inline-block', textDecoration: 'none' }}>
        Create a Family Space
      </Link>
    </>
  );
}
