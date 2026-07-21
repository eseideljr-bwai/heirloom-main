/**
 * Family-space mutations: invitations + member CRUD.
 *
 * Read paths (overview, tree, manage-members) live in lib/server/queries.ts.
 * These are the browser-side mutation entry points consumed by the
 * `/family/members` UI in Epic 4.
 */

import { apiFetch } from './api';

// ─── Invitations ────────────────────────────────────────────────────

export type InviteRole = 'owner' | 'member';

export type CreateInvitationPayload = {
  email: string;
  role?: InviteRole | null;
  /** 1-720, default applied server-side. */
  expires_in_hours?: number | null;
};

export type CreateInvitationResponse = {
  invitation: {
    ulid: string;
    email: string;
    role: string;
    expires_at: string;
  };
  /** 64-char raw token. The UI surfaces it once so the inviter can share the link. */
  invite_token: string;
};

/** POST /family-spaces/{familySpace}/invitations */
export async function createInvitation(
  familySpaceId: string,
  payload: CreateInvitationPayload,
): Promise<CreateInvitationResponse> {
  return apiFetch<CreateInvitationResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/invitations`,
    { method: 'POST', body: payload },
  );
}

/** DELETE /family-spaces/{familySpace}/invitations/{invitation} */
export async function revokeInvitation(
  familySpaceId: string,
  invitationId: string,
): Promise<void> {
  await apiFetch<void>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE' },
  );
}

/** POST /invitations/accept (no familySpace — token is global). */
export async function acceptInvitation(
  token: string,
): Promise<{ family_space: { ulid: string; name: string } }> {
  return apiFetch<{ family_space: { ulid: string; name: string } }>(
    '/invitations/accept',
    { method: 'POST', body: { token } },
  );
}

// ─── Members ────────────────────────────────────────────────────────

export type Gender = 'f' | 'm' | 'n';

export type CreateMemberPayload = {
  name: string;
  role_label?: string | null;
  gender?: Gender | null;
  /** 7-char hex like `#a39376`. */
  tone?: string | null;
  birth_year?: number | null;
  is_deceased?: boolean | null;
  date_of_death?: string | null;
  description?: string | null;
  parent_member_ids?: string[];
  spouse_member_ids?: string[];
};

export type UpdateMemberPayload = {
  name?: string;
  role_label?: string | null;
  gender?: Gender;
  tone?: string;
  birth_year?: number | null;
  is_deceased?: boolean;
  date_of_death?: string | null;
  description?: string | null;
};

export type MemberMutationResponse = {
  member: {
    member_id: string;
    name: string;
  };
};

/** POST /family-spaces/{familySpace}/members */
export async function createMember(
  familySpaceId: string,
  payload: CreateMemberPayload,
): Promise<MemberMutationResponse> {
  return apiFetch<MemberMutationResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/members`,
    { method: 'POST', body: payload },
  );
}

/** PATCH /family-spaces/{familySpace}/members/{member} */
export async function updateMember(
  familySpaceId: string,
  memberId: string,
  payload: UpdateMemberPayload,
): Promise<MemberMutationResponse> {
  return apiFetch<MemberMutationResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body: payload },
  );
}

export type DeleteMemberOptions = {
  /**
   * Keep the person in the family tree as a non-user placeholder instead of
   * removing them entirely. Sends `{ convert_to_non_user: true }` and the
   * backend responds 200 with the converted member object.
   */
  convertToNonUser?: boolean;
};

/**
 * DELETE /family-spaces/{familySpace}/members/{member}
 *
 * Two modes, per the removal contract:
 *   - Default (no body)            → 204, full removal. Returns void.
 *   - { convertToNonUser: true }   → 200 + member, converts to placeholder.
 *
 * Owner removal is rejected upstream with 422; the message surfaces via
 * `ApiError.message` for the caller to display.
 */
export async function deleteMember(
  familySpaceId: string,
  memberId: string,
  options?: { convertToNonUser?: false },
): Promise<void>;
export async function deleteMember(
  familySpaceId: string,
  memberId: string,
  options: { convertToNonUser: true },
): Promise<MemberMutationResponse>;
export async function deleteMember(
  familySpaceId: string,
  memberId: string,
  options: DeleteMemberOptions = {},
): Promise<void | MemberMutationResponse> {
  const path = `/family-spaces/${encodeURIComponent(familySpaceId)}/members/${encodeURIComponent(memberId)}`;
  if (options.convertToNonUser) {
    // JSON body → apiFetch sets Content-Type and returns the parsed 200 body.
    return apiFetch<MemberMutationResponse>(path, {
      method: 'DELETE',
      body: { convert_to_non_user: true },
    });
  }
  // No body → no Content-Type; apiFetch returns undefined on 204.
  await apiFetch<void>(path, { method: 'DELETE' });
}
