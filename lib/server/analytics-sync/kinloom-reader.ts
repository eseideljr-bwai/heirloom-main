/**
 * The existing Laravel reads the sync needs, made as the signed-in member.
 *
 * Identity (D12): serverApiFetch takes the Bearer from the HttpOnly
 * `kinloom_id_token` cookie (re-minted from the HttpOnly session cookie when
 * it has expired). Page code never handles a token. No cookie → it throws,
 * and the sync treats that as "not signed in".
 *
 * No new endpoints; only GETs the app already makes elsewhere.
 */

import 'server-only';
import { serverApiFetch } from '../api';
import type { InvitationLike, KinloomReader, MeLike, ProfileLike } from './core';

type VaultPage = { data: { created_at: string }[]; meta: { total: number } };
type ProfileResponse = { birth_date: string | null; person?: { gender?: 'f' | 'm' | 'n' | null } | null };
type ManageResponse = { invitations?: { id: string; email: string }[] | null };

function invitations(list: ManageResponse['invitations']): InvitationLike[] | null {
  if (!list) return null;
  return list.map(i => ({ id: i.id, email: i.email }));
}

export function createKinloomReader(): KinloomReader {
  return {
    me: () => serverApiFetch<MeLike>('/me'),

    async profile(): Promise<ProfileLike> {
      const p = await serverApiFetch<ProfileResponse>('/me/profile');
      return { birth_date: p.birth_date ?? null, gender: p.person?.gender ?? null };
    },

    async finalKinloomsPage(page: number) {
      const qs = new URLSearchParams({ status: 'final', per_page: '1', page: String(page) });
      const v = await serverApiFetch<VaultPage>(`/vault?${qs}`);
      return { total: v.meta.total, createdAt: v.data[0]?.created_at ?? null };
    },

    async homeInvitations(homeId: string) {
      const m = await serverApiFetch<ManageResponse>(`/family-homes/${encodeURIComponent(homeId)}/manage`);
      return invitations(m.invitations) ?? [];
    },

    async spaceInvitations(spaceId: string) {
      const m = await serverApiFetch<ManageResponse>(`/family-spaces/${encodeURIComponent(spaceId)}/manage`);
      return invitations(m.invitations);
    },
  };
}
