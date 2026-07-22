/**
 * Content-emptiness helpers shared by the client and the /converse route.
 *
 * The Anthropic Messages API rejects a message whose content carries nothing
 * usable — an empty/whitespace string, an empty array, or a content-block
 * array whose only blocks are empty text blocks. A single such turn poisons
 * the client-owned transcript: it renders as nothing, persists to
 * sessionStorage, and 400s on every subsequent send.
 *
 * Both sides validate against the SAME definition so they never disagree
 * about what "empty" means:
 *   - client: append guard + sanitize-on-read (ConversationView)
 *   - server: request validator (app/api/agent/converse/route.ts)
 */

/** A content block whose only "value" is empty/whitespace text carries nothing. */
function isEmptyBlock(block: unknown): boolean {
  if (!block || typeof block !== 'object') return true;
  const b = block as { type?: unknown; text?: unknown };
  // Only text blocks can be empty in a way the API rejects. tool_use,
  // tool_result, image, etc. always carry payload and count as real content.
  if (b.type === 'text') return String(b.text ?? '').trim().length === 0;
  return false;
}

/**
 * True when a message's `content` carries nothing the API will accept:
 * an empty/whitespace string, a non-array/non-string value, an empty array,
 * or an array of only-empty text blocks.
 */
export function isEmptyContent(content: unknown): boolean {
  if (typeof content === 'string') return content.trim().length === 0;
  if (!Array.isArray(content)) return true;
  if (content.length === 0) return true;
  return content.every(isEmptyBlock);
}

/** True when a message (any role) contains an unpaired tool_use block. */
function hasToolUse(content: unknown): boolean {
  return Array.isArray(content) && content.some(
    b => !!b && typeof b === 'object' && (b as { type?: unknown }).type === 'tool_use',
  );
}

/**
 * Heal an already-poisoned stored transcript so it can be used again instead
 * of hard-erroring on every send.
 *
 * If nothing is empty, the transcript is returned untouched — healthy sessions
 * (including one that legitimately ends on a proposal card) are never trimmed.
 *
 * If a poison turn is found, it is dropped, and the tail is then walked back to
 * a clean resume point: the last message that is a normal assistant turn (text,
 * no tool_use). This discards any now-dangling user answer/tool_result and any
 * unpaired assistant tool_use (which would otherwise 400 on the next send),
 * returning the user to a point where they can simply keep typing.
 */
export function sanitizeStoredMessages<T extends { role: string; content: unknown }>(messages: T[]): T[] {
  const cleaned = messages.filter(m => !isEmptyContent(m.content));
  if (cleaned.length === messages.length) return messages;

  let end = cleaned.length;
  while (end > 0) {
    const m = cleaned[end - 1];
    if (m.role === 'user' || hasToolUse(m.content)) {
      end--;
      continue;
    }
    break;
  }
  return cleaned.slice(0, end);
}
