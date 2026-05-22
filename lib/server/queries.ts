/**
 * Server-side query helpers — every read path used by SSR pages.
 *
 * All of these use `serverApiFetch` (which reads the HttpOnly id_token
 * cookie via next/headers) and are wrapped in `react.cache` so multiple
 * server components in the same request share one round-trip.
 *
 * Mutations (POST/PATCH/DELETE) stay in lib/kinloom.ts and lib/auth.ts
 * — those are called from client components and go through the
 * `/api/proxy` BFF.
 */

import 'server-only';
import { cache } from 'react';
import { serverApiFetch } from './api';
import { normalizeList, type Kinloom, type KinloomAuthor, type LibraryRow, type LibraryResponse } from '../kinloom';
import type { MeSettings } from '../auth';

// ─── Home ────────────────────────────────────────────────────────────

export type HomeUserSummary = {
  ulid: string;
  display_name: string | null;
  member_id: string;
  role_label: string;
};

export type HomeRecentKinloom = {
  ulid: string;
  type_slug: string;
  type_label: string;
  title: string;
  excerpt?: string | null;
  created_at: string;
  has_audio?: boolean;
  has_photo?: boolean;
  author: KinloomAuthor | null;
};

export type HomeWhisper = {
  id: string;
  actor: KinloomAuthor | null;
  line: string;
  sub?: string | null;
  when?: string | null;
  /** Optional kinloom ulid to deep-link the row to. */
  target?: string | null;
};

export type HomeLegacyBankProgress = {
  total_kinlooms: number;
  target: number;
  percent: number | null;
};

export type HomeResponseRaw = {
  user_summary: HomeUserSummary;
  recent_kinlooms: HomeRecentKinloom[] | string;
  recent_whispers: HomeWhisper[] | string;
  legacy_bank_progress: HomeLegacyBankProgress;
};

export type HomeData = {
  userSummary: HomeUserSummary;
  recentKinlooms: HomeRecentKinloom[];
  recentWhispers: HomeWhisper[];
  legacyBankProgress: HomeLegacyBankProgress;
};

export const getHome = cache(async (familySpaceId: string): Promise<HomeData> => {
  const res = await serverApiFetch<HomeResponseRaw>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/home`,
  );
  return {
    userSummary: res.user_summary,
    recentKinlooms: normalizeList<HomeRecentKinloom>(res.recent_kinlooms),
    recentWhispers: normalizeList<HomeWhisper>(res.recent_whispers),
    legacyBankProgress: res.legacy_bank_progress,
  };
});

// ─── Library ─────────────────────────────────────────────────────────

export const getLibraryServer = cache(async (familySpaceId: string): Promise<{
  total: number;
  kinlooms: LibraryRow[];
  nextCursor: string | null;
}> => {
  const res = await serverApiFetch<LibraryResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/library`,
  );
  const total = typeof res.total === 'number' ? res.total : Number(res.total) || 0;
  return {
    total,
    kinlooms: normalizeList<LibraryRow>(res.kinlooms),
    nextCursor: res.next_cursor ?? null,
  };
});

// ─── Kinloom detail ──────────────────────────────────────────────────

export const getKinloomServer = cache(async (
  familySpaceId: string,
  kinloomId: string,
): Promise<Kinloom> => {
  return serverApiFetch<Kinloom>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}`,
  );
});

// ─── Family ──────────────────────────────────────────────────────────

export type FamilyMember = {
  member_id: string;
  name: string;
  role_label: string | null;
  kin_term: string | null;
  gender: 'f' | 'm' | 'n' | string;
  tone: string;
  initials: string | null;
  deceased: boolean;
  is_me?: boolean;
  kinloom_count?: number;
  birth_year?: number | null;
  description?: string | null;
};

export type FamilyGeneration = {
  generation: number | string;
  label: string;
  members: FamilyMember[] | string;
};

export type FamilyOverviewResponse = {
  space: { ulid: string; name: string };
  members_by_generation: FamilyGeneration[];
};

export const getFamilyOverview = cache(async (familySpaceId: string): Promise<{
  space: { ulid: string; name: string };
  generations: { generation: string; label: string; members: FamilyMember[] }[];
}> => {
  const res = await serverApiFetch<FamilyOverviewResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/family-overview`,
  );
  return {
    space: res.space,
    generations: (res.members_by_generation || []).map(g => ({
      generation: String(g.generation),
      label: g.label,
      members: normalizeList<FamilyMember>(g.members),
    })),
  };
});

export type Whisper = {
  id?: string;
  actor?: KinloomAuthor | null;
  line: string;
  sub?: string | null;
  when?: string | null;
  target?: string | null;
};

export type FamilyFeedResponse = {
  recent_whispers: Whisper[] | string;
  family_kinlooms: LibraryRow[] | string;
  totals: { kinlooms: number; contributors: number };
};

export const getFamilyFeed = cache(async (familySpaceId: string): Promise<{
  whispers: Whisper[];
  kinlooms: LibraryRow[];
  totals: { kinlooms: number; contributors: number };
}> => {
  const res = await serverApiFetch<FamilyFeedResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/family-feed`,
  );
  return {
    whispers: normalizeList<Whisper>(res.recent_whispers),
    kinlooms: normalizeList<LibraryRow>(res.family_kinlooms),
    totals: res.totals,
  };
});

export type FamilyTreeNode = {
  member_id: string;
  name: string;
  role_label: string | null;
  gender: 'f' | 'm' | 'n' | string;
  tone: string;
  deceased: boolean;
  /** Some APIs include a generation index for layout. */
  generation?: number | string;
};

export type FamilyTreeResponse = {
  nodes: FamilyTreeNode[] | string;
  parent_edges: [string, string][] | string;
  couple_edges: [string, string][];
};

export const getFamilyTree = cache(async (familySpaceId: string): Promise<{
  nodes: FamilyTreeNode[];
  parentEdges: [string, string][];
  coupleEdges: [string, string][];
}> => {
  const res = await serverApiFetch<FamilyTreeResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/family-tree`,
  );
  return {
    nodes: normalizeList<FamilyTreeNode>(res.nodes),
    parentEdges: normalizeList<[string, string]>(res.parent_edges),
    coupleEdges: res.couple_edges || [],
  };
});

// ─── Member profile ─────────────────────────────────────────────────

export type MemberProfileResponse = {
  member: FamilyMember;
  kinloom_count?: number;
  kinlooms?: LibraryRow[] | string;
};

export const getMemberProfile = cache(async (
  familySpaceId: string,
  memberId: string,
): Promise<{ member: FamilyMember; kinloomCount: number; kinlooms: LibraryRow[] }> => {
  const res = await serverApiFetch<MemberProfileResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/members/${encodeURIComponent(memberId)}/profile`,
  );
  return {
    member: res.member,
    kinloomCount: res.kinloom_count ?? 0,
    kinlooms: normalizeList<LibraryRow>(res.kinlooms),
  };
});

// ─── Manage members ─────────────────────────────────────────────────

export type PendingInvitation = {
  ulid: string;
  email: string;
  role_label?: string | null;
  invited_at?: string;
  expires_at?: string;
};

export type ManageMembersResponse = {
  members: FamilyMember[] | string;
  pending_invitations: PendingInvitation[] | string;
};

export const getManageMembers = cache(async (familySpaceId: string): Promise<{
  members: FamilyMember[];
  pending: PendingInvitation[];
}> => {
  const res = await serverApiFetch<ManageMembersResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/manage-members`,
  );
  return {
    members: normalizeList<FamilyMember>(res.members),
    pending: normalizeList<PendingInvitation>(res.pending_invitations),
  };
});

// ─── Legacy Bank ─────────────────────────────────────────────────────

export type LegacyBankProgress = {
  total_kinlooms: number;
  target: number;
  percent: number | null;
};

export type LegacyBankConversation = {
  ulid: string;
  subject_member_id: string;
  subject_name: string;
  last_message_at?: string;
  message_count?: number;
};

export type LegacyBankSubject = FamilyMember & {
  can_ask?: boolean;
};

export type LegacyBankResponse = {
  progress: LegacyBankProgress;
  recent_conversations: LegacyBankConversation[] | string;
  available_subjects: LegacyBankSubject[] | string;
};

// ─── Me settings ─────────────────────────────────────────────────────

export const getMeSettings = cache(async (
  familySpaceId?: string | null,
): Promise<MeSettings> => {
  const qs = familySpaceId ? `?family_space_id=${encodeURIComponent(familySpaceId)}` : '';
  return serverApiFetch<MeSettings>(`/me/settings${qs}`);
});

export const getLegacyBank = cache(async (familySpaceId: string): Promise<{
  progress: LegacyBankProgress;
  conversations: LegacyBankConversation[];
  subjects: LegacyBankSubject[];
}> => {
  const res = await serverApiFetch<LegacyBankResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/legacy-bank`,
  );
  return {
    progress: res.progress,
    conversations: normalizeList<LegacyBankConversation>(res.recent_conversations),
    subjects: normalizeList<LegacyBankSubject>(res.available_subjects),
  };
});
