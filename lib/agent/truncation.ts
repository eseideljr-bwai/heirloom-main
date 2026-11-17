/**
 * Truncated-turn detection, shared by the Talk (/converse) and Biographer
 * routes.
 *
 * When generation hits `max_tokens` mid-tool_use the API returns the block
 * with an EMPTY input — not a partial object — so there is nothing to
 * salvage and no client-side guard can reconstruct it. A turn like that must
 * never reach the browser: the client persists assistant turns to
 * sessionStorage, and an unanswered/unusable tool_use poisons the transcript
 * for every subsequent send.
 *
 * Extracted from the Biographer route (BIO-16), which hit this first on
 * whole-document batches. The checks are per-tool and carry no Biographer-
 * specific assumptions, so both agents share them.
 */

import type Anthropic from '@anthropic-ai/sdk';

export type ToolUseBlock = Extract<Anthropic.Messages.ContentBlock, { type: 'tool_use' }>;

/** First tool_use block in an assistant turn, or null. */
export function findToolUse(content: Anthropic.Messages.ContentBlock[]): ToolUseBlock | null {
  for (const block of content) {
    if (block.type === 'tool_use') return block as ToolUseBlock;
  }
  return null;
}

/**
 * True when a tool_use carries nothing the client can render — an empty input
 * (the max_tokens signature), or an input whose required fields are missing,
 * which is the same class of failure arriving by a different route.
 */
export function toolUseIsUnusable(block: ToolUseBlock): boolean {
  const input = block.input as Record<string, unknown> | null | undefined;
  if (!input || typeof input !== 'object' || Object.keys(input).length === 0) return true;

  if (block.name === 'split_into_multiple') {
    const items = input.proposed_kinlooms;
    if (!Array.isArray(items) || items.length === 0) return true;
    // A single malformed item is enough to break the card's render.
    return items.some(item => {
      if (!item || typeof item !== 'object') return true;
      const k = item as Record<string, unknown>;
      return (
        typeof k.working_title !== 'string' ||
        typeof k.one_line_summary !== 'string' ||
        typeof k.body !== 'string' ||
        typeof k.suggested_type_slug !== 'string'
      );
    });
  }

  if (block.name === 'propose_draft') {
    return (
      typeof input.title !== 'string' ||
      typeof input.type_slug !== 'string' ||
      typeof input.body !== 'string'
    );
  }

  if (block.name === 'ask_choices') {
    const questions = input.questions;
    return !Array.isArray(questions) || questions.length === 0;
  }

  return false;
}

/**
 * True when a turn came back truncated and must not be returned to the client.
 *
 * Scoped deliberately to turns carrying a tool_use. A prose turn that stops on
 * `max_tokens` is also broken, but the remedies differ per agent and steering
 * a truncated explanation with a tool-shaped instruction answers the wrong
 * question. Callers log `stop_reason` so prose truncation stays visible.
 */
export function turnIsTruncated(response: Anthropic.Messages.Message): boolean {
  const toolUse = findToolUse(response.content);
  if (!toolUse) return false;
  return toolUseIsUnusable(toolUse);
}
