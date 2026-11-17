/**
 * What Talk knows about the member, loaded server-side for every turn.
 *
 * `GET /me/talk-context` returns the member, their Family Home's people, their
 * newest kinlooms, their unfinished drafts and the notes Talk has saved, plus
 * `prompt`: the same facts as one plain-text block (≤ 6,000 chars) that the
 * backend has already framed as data, not instructions. That block is what
 * goes to the model; we never assemble our own from the JSON.
 *
 * Loaded on every turn, including the first, so the agent knows the member
 * from its very first reply and picks up note changes mid-session.
 *
 * Privacy: notes must never be logged. Nothing from the response is logged
 * here; on failure only the status code is.
 */

import 'server-only';
import { ApiError } from '../api';
import { serverApiFetch } from '../server/api';
import type { components } from '../api-schema/kinloom';

export type TalkContext = components['schemas']['TalkContext'];

/**
 * The context block for the system prompt, or null when it can't be loaded.
 *
 * Failing open is deliberate: the context makes Talk better, but Talk still
 * works without it, and a failed read changes nothing.
 */
export async function loadTalkContextPrompt(): Promise<string | null> {
  try {
    const ctx = await serverApiFetch<TalkContext>('/me/talk-context');
    const prompt = typeof ctx?.prompt === 'string' ? ctx.prompt.trim() : '';
    return prompt.length > 0 ? prompt : null;
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 'n/a';
    const name = err instanceof Error ? err.name : 'unknown';
    console.error(`[agent/talk-context] load failed: status=${status} error=${name}; continuing without context`);
    return null;
  }
}
