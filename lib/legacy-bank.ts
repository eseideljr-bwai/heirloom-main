/**
 * Legacy Bank client-side mutations — conversation create/ask.
 *
 * Reads (list/show) live in lib/server/queries.ts alongside the rest of
 * the SSR query helpers; these go through the browser `/api/proxy` BFF
 * like the other mutation helpers in lib/kinloom.ts.
 */

import { apiFetch } from './api';
import type { LegacyBankConversation, LegacyBankMessage, LegacyBankSource } from './server/queries';

export type CreateLegacyBankConversationPayload = {
  mode: 'living' | 'sealed';
  subject_member_id?: string | null;
  title?: string | null;
};

/** POST /family-spaces/{familySpace}/legacy-bank/conversations */
export async function createLegacyBankConversation(
  familySpaceId: string,
  payload: CreateLegacyBankConversationPayload,
): Promise<LegacyBankConversation> {
  return apiFetch<LegacyBankConversation>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/legacy-bank/conversations`,
    { method: 'POST', body: payload },
  );
}

/** POST /family-spaces/{familySpace}/legacy-bank/conversations/{conversation}/ask */
export async function askLegacyBank(
  familySpaceId: string,
  conversationId: string,
  question: string,
): Promise<LegacyBankMessage> {
  return apiFetch<LegacyBankMessage>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/legacy-bank/conversations/${encodeURIComponent(conversationId)}/ask`,
    { method: 'POST', body: { question } },
  );
}

/**
 * Sources arrive as hydrated `{id, title, type}` objects once the backend
 * hydration change ships; until then the API still returns raw entry-ID
 * strings. Normalize either shape so rendering never has to care.
 */
export function normalizeSources(sources: LegacyBankSource[] | string[] | null | undefined): LegacyBankSource[] {
  if (!sources) return [];
  return sources.map(s => (typeof s === 'string' ? { id: s, title: s, type: '' } : s));
}

/**
 * The three starter questions shown on a person's Legacy Bank and on
 * their Legacy Portrait. Derived from the kinloom types that person
 * actually has, so the prompts never offer a door that opens on nothing.
 *
 * Deliberately takes structural shapes rather than FamilyMember /
 * LibraryRow, so this stays importable from both server and client code.
 */
export function suggestedQuestions(
  member: { name?: string | null },
  kinlooms: { type_slug?: string | null }[],
): string[] {
  const firstName = member.name?.split(' ')[0] || 'them';
  const types = new Set(kinlooms.map(k => k.type_slug).filter(Boolean));
  const out: string[] = [];
  if (types.has('story')) out.push(`What's a story from ${firstName}'s life that shaped them?`);
  if (types.has('lesson')) out.push(`What life lessons did ${firstName} most want to pass on?`);
  if (types.has('belief')) out.push(`What did ${firstName} believe was most worth holding onto?`);
  if (types.has('message')) out.push(`What did ${firstName} want their family to remember?`);
  if (out.length < 2) out.push(`What did ${firstName} find most meaningful?`);
  return out.slice(0, 3);
}
