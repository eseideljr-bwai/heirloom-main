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
