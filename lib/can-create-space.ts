import type { AuthUser } from './auth';

/**
 * Why this person can't create a Family Space, or null when they can.
 * `GET /me` → `can_create_space` is the check itself (Family plan, and you
 * own or co-own your Home); this only words the reason from the plan and the
 * person's role in their Home.
 */
export function createSpaceBlockedReason(user: AuthUser): string | null {
  if (user.can_create_space) return null;
  const ownsHome = user.home.role === 'owner' || user.home.role === 'co_owner';
  return ownsHome && user.plan !== 'family'
    ? 'Creating a Family Space needs the Family plan. Your plan is in Settings.'
    : 'Only the owner or a co-owner of your Family Home can create a Family Space. Ask them, or wait for an invitation.';
}
