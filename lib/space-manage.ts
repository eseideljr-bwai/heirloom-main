/**
 * Manage Space mutations (Phase 3): inviting and approving Homes, lineage,
 * ownership and leaving. The page reads `GET /family-spaces/{id}/manage` on
 * the server; every button there is gated on the flags that response carries
 * (`space.viewer.can_edit`, `can_leave`, `homes[].can_remove`), never on the
 * client's own idea of who owns what.
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

export type SpaceManage = Schemas['SpaceManage'];
export type SpaceHome = Schemas['SpaceHome'];
export type SpacePendingHome = Schemas['SpacePendingHome'];
export type SpaceInvitation = Schemas['SpaceInvitation'];
export type PersonCard = Schemas['PersonCard'];

/**
 * POST /family-spaces: your Home becomes the first Home of a new Space and you
 * its owner. Needs `can_create_space` on `GET /me` (Family plan, and you own or
 * co-own your Home). The Space starts with your Home unplaced on the tree.
 */
export function createFamilySpace(name: string, description?: string) {
  const trimmed = description?.trim();
  return kinloomApi.post('/family-spaces', {
    body: { name: name.trim(), ...(trimmed ? { description: trimmed } : {}) },
  });
}

/** POST /family-spaces/{id}/invitations. `invite_token` is in this response only. */
export function inviteHomeToSpace(spaceId: string, email: string) {
  return kinloomApi.post('/family-spaces/{familySpace}/invitations', {
    path: { familySpace: spaceId },
    body: { email },
  });
}

/** DELETE /family-spaces/{id}/invitations/{invitation}: the link stops working. */
export async function cancelSpaceInvitation(spaceId: string, invitationId: string): Promise<void> {
  await kinloomApi.delete('/family-spaces/{familySpace}/invitations/{invitation}', {
    path: { familySpace: spaceId, invitation: invitationId },
  });
}

/** POST …/homes/{home}/approve: a pending Home becomes active, optionally placed on the tree. */
export function approveSpaceHome(spaceId: string, homeId: string, parents: string[]) {
  return kinloomApi.post('/family-spaces/{familySpace}/homes/{familyHome}/approve', {
    path: { familySpace: spaceId, familyHome: homeId },
    body: { parents },
  });
}

/** DELETE …/homes/{home}: removes an active Home, or declines a pending one. */
export async function removeSpaceHome(spaceId: string, homeId: string): Promise<void> {
  await kinloomApi.delete('/family-spaces/{familySpace}/homes/{familyHome}', {
    path: { familySpace: spaceId, familyHome: homeId },
  });
}

/** PUT …/homes/{home}/lineage: replaces the Home's parents (at most two). `[]` unplaces it. */
export function setSpaceLineage(spaceId: string, homeId: string, parents: string[]) {
  return kinloomApi.put('/family-spaces/{familySpace}/homes/{familyHome}/lineage', {
    path: { familySpace: spaceId, familyHome: homeId },
    body: { parents },
  });
}

/** POST /family-spaces/{id}/transfer (owner only). */
export function transferSpace(spaceId: string, newOwnerMemberId: string) {
  return kinloomApi.post('/family-spaces/{familySpace}/transfer', {
    path: { familySpace: spaceId },
    body: { new_owner_member_id: newOwnerMemberId },
  });
}

/** PUT /family-spaces/{id}/successor (owner only). `null` clears it. */
export function setSpaceSuccessor(spaceId: string, memberId: string | null) {
  return kinloomApi.put('/family-spaces/{familySpace}/successor', {
    path: { familySpace: spaceId },
    body: { successor_member_id: memberId },
  });
}

/** POST /family-spaces/{id}/leave: takes your whole Home out of the Space. */
export async function leaveSpace(spaceId: string): Promise<void> {
  await kinloomApi.post('/family-spaces/{familySpace}/leave', { path: { familySpace: spaceId } });
}
