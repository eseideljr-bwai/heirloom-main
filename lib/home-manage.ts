/**
 * Manage Family mutations (Phase 3): invitations, family profiles and the
 * people in a Family Home. Reads come from `GET /family-homes/{id}/manage`
 * (server side). Each `can_*` flag on that response says what the viewer may
 * do; these calls never decide that themselves.
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

export type HomeManage = Schemas['HomeManage'];
export type HomeMember = Schemas['HomeMember'];
export type HomeInvitation = Schemas['HomeInvitation'];
export type HomeInvitationCreated = Schemas['HomeInvitationCreated'];
export type HomeProfileBody = Schemas['HomeProfileRequest'];
export type HomeMemberUpdateBody = Schemas['HomeMemberUpdateRequest'];

/** POST /family-homes/{id}/invitations. `invite_token` is in this response only. */
export function inviteToHome(
  homeId: string,
  body: { email: string; claim_member_id?: string | null },
): Promise<HomeInvitationCreated> {
  return kinloomApi.post('/family-homes/{familyHome}/invitations', {
    path: { familyHome: homeId },
    body,
  });
}

/** DELETE /family-homes/{id}/invitations/{invitation}: frees the seat. */
export async function revokeHomeInvitation(homeId: string, invitationId: string): Promise<void> {
  await kinloomApi.delete('/family-homes/{familyHome}/invitations/{invitation}', {
    path: { familyHome: homeId, invitation: invitationId },
  });
}

/** POST /family-homes/{id}/profiles: a person without an account. */
export function addFamilyProfile(homeId: string, body: HomeProfileBody): Promise<HomeMember> {
  return kinloomApi.post('/family-homes/{familyHome}/profiles', {
    path: { familyHome: homeId },
    body,
  });
}

/**
 * PATCH /family-homes/{id}/members/{member}. A family profile takes any
 * field; an account takes only `relationship_label` (the rest is theirs).
 */
export function updateHomeMember(
  homeId: string,
  memberId: string,
  body: HomeMemberUpdateBody,
): Promise<HomeMember> {
  return kinloomApi.patch('/family-homes/{familyHome}/members/{member}', {
    path: { familyHome: homeId, member: memberId },
    body,
  });
}

/** DELETE /family-homes/{id}/members/{member}. */
export async function removeHomeMember(homeId: string, memberId: string): Promise<void> {
  await kinloomApi.delete('/family-homes/{familyHome}/members/{member}', {
    path: { familyHome: homeId, member: memberId },
  });
}

export type HomeRoles = Schemas['HomeRoles'];
export type HomeLeaveResult = Schemas['HomeLeaveResult'];

/**
 * PUT /family-homes/{id}/roles (owner only). The body replaces both roles and
 * `null` clears one, so callers always send the pair they want afterwards.
 */
export function setHomeRoles(
  homeId: string,
  body: { co_owner_member_id: string | null; successor_member_id: string | null },
): Promise<HomeRoles> {
  return kinloomApi.put('/family-homes/{familyHome}/roles', {
    path: { familyHome: homeId },
    body,
  });
}

/** POST /family-homes/{id}/transfer (owner only): the owner becomes co-owner or member. */
export function transferHomeOwnership(homeId: string, newOwnerMemberId: string): Promise<HomeRoles> {
  return kinloomApi.post('/family-homes/{familyHome}/transfer', {
    path: { familyHome: homeId },
    body: { new_owner_member_id: newOwnerMemberId },
  });
}

/** POST /family-homes/{id}/leave: lands you in a new solo Home you own. */
export function leaveHomeForSolo(homeId: string): Promise<HomeLeaveResult> {
  return kinloomApi.post('/family-homes/{familyHome}/leave', { path: { familyHome: homeId } });
}
