/**
 * Invitation links (contract §6.5): the preview behind `/invite/{token}`,
 * accepting it, and leaving a Home that blocks a move.
 *
 * The preview has two tiers. Anyone with the link gets the public tier
 * (who invited you, to what). Signed in with the invited, verified email,
 * you also get what accepting would do from your current Home.
 */

import { kinloomApi } from './kinloom-api';
import { ApiError } from './api';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

export type InvitationPreviewPublic = Schemas['InvitationPreviewPublic'];
export type InvitationPreviewInvitee = Schemas['InvitationPreviewInvitee'];
export type InvitationPreview = Schemas['InvitationPreview'];
export type InvitationMode = Schemas['InvitationMode'];
export type InvitationAccepted = Schemas['InvitationAccepted'];
export type InvitationPublishItem = Schemas['InvitationPublishItem'];

/** The invitee tier adds `mode`; the public tier has none. */
export function isInviteeTier(p: InvitationPreview): p is InvitationPreviewInvitee {
  return 'mode' in p && !!(p as InvitationPreviewInvitee).mode;
}

/** The API's machine code on an error ("invitation_used", "email_unverified", …). */
export function apiErrorCode(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body as { error?: unknown } | null;
  return body && typeof body.error === 'string' ? body.error : null;
}

/** POST /invitations/accept. A replay by the same account answers 200 again. */
export function acceptHomeOrSpaceInvitation(
  token: string,
  publish?: InvitationPublishItem[],
): Promise<InvitationAccepted> {
  return kinloomApi.post('/invitations/accept', {
    body: publish && publish.length > 0 ? { token, publish } : { token },
  });
}

/** POST /family-homes/{id}/leave: lands you in a new solo Home. */
export async function leaveHome(homeId: string): Promise<void> {
  await kinloomApi.post('/family-homes/{familyHome}/leave', { path: { familyHome: homeId } });
}
