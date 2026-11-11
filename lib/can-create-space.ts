import type { AuthUser } from './auth';

/** Owner or co-owner of their Family Home: the only people who can create a Space. */
function ownsHome(user: AuthUser): boolean {
  return user.home.role === 'owner' || user.home.role === 'co_owner';
}

/**
 * True when the Family plan is the only thing between this person and
 * creating a Space: they own or co-own their Home, and `GET /me` says no.
 * The upgrade button shows only then, so it never promises what the API
 * would still refuse.
 */
export function canUpgradeToCreateSpace(user: AuthUser): boolean {
  return !user.can_create_space && ownsHome(user) && user.plan !== 'family';
}

/**
 * Why this person can't create a Family Space, or null when they can.
 * `GET /me` → `can_create_space` is the check itself (Family plan, and you
 * own or co-own your Home); this only words the reason from the plan and the
 * person's role in their Home.
 */
export function createSpaceBlockedReason(user: AuthUser): string | null {
  if (user.can_create_space) return null;
  return ownsHome(user) && user.plan !== 'family'
    ? 'Creating a Family Space needs the Family plan.'
    : 'Only the owner or a co-owner of your Family Home can create a Family Space. Ask them, or wait for an invitation.';
}
