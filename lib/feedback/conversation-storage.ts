/**
 * sessionStorage for the feedback conversation.
 *
 * Mirrors lib/agent/client-storage.ts and lib/biographer/client-storage.ts:
 * a load/save/clear trio, a `typeof window` guard, a try/catch that treats a
 * full or unavailable store as non-fatal, and shape validation on read.
 *
 * The `messages` array is stored in the EXACT shape the payload expects
 * (FeedbackMessage — role, content, sequence). It is not a private
 * conversation format that gets converted at submit time. There is no
 * transform step, so there is nothing to get wrong later.
 */

import type { FeedbackMessage } from './types';
import type { ScriptBranch } from './scripted-agent';

const STORAGE_KEY = 'kinloom:feedback:conversation';

export type FeedbackConversation = {
  /** Which scripted path this conversation is on. Fixed once it starts. */
  branch: ScriptBranch;
  /** How many clarifying questions have been asked. Never exceeds two. */
  asked: number;
  /** 'complete' means the conversation has reached the confirmation card. */
  phase: 'asking' | 'complete';
  /** Verbatim, payload-shaped, in order. */
  messages: FeedbackMessage[];
};

function isConversation(value: unknown): value is FeedbackConversation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<FeedbackConversation>;
  return (
    typeof candidate.branch === 'string' &&
    typeof candidate.asked === 'number' &&
    (candidate.phase === 'asking' || candidate.phase === 'complete') &&
    Array.isArray(candidate.messages)
  );
}

export function loadConversation(): FeedbackConversation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConversation(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConversation(conversation: FeedbackConversation): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conversation));
  } catch {
    // sessionStorage may be full or unavailable — not fatal
  }
}

export function clearConversation(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
