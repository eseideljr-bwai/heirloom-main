/**
 * POST /api/agent/biographer
 *
 * Stateless conversation endpoint for the Biographer (Import) creation
 * mode. The client owns the full message history and sends it on every
 * turn, along with the extracted document text.
 *
 * Caching (REQUIRED — primary cost lever for this agent):
 *   - System prompt block: cache_control { type: 'ephemeral' }
 *   - Document content block: cache_control { type: 'ephemeral' }
 *   The document is large and static, so every follow-up turn reads it
 *   from cache at ~10% of base input cost.
 *
 * Model: claude-sonnet-4-6.
 *   Do NOT route to Haiku — that eval is deferred.
 *
 * Request:  { documentText: string; messages: MessageParam[] }
 *   `messages` is the conversation history AFTER the document turn.
 *   The route prepends the document as the first user message.
 *
 * Response: { message: ContentBlock[]; stop_reason: string }
 */

import { NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { resolveActiveSpaceForRoute } from '../../../../lib/server/auth';
import { getAnthropicClient } from '../../../../lib/agent/client';
import { BIOGRAPHER_TOOLS } from '../../../../lib/agent/tools';
import { BIOGRAPHER_SYSTEM_PROMPT } from '../../../../lib/biographer/system-prompt';
import { MAX_TURNS, type MessageParam, type ConverseResponse } from '../../../../lib/agent/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BIOGRAPHER_MODEL = 'claude-sonnet-4-6';
/**
 * Output ceiling for a Biographer turn.
 *
 * 2048 was marginal: a whole-document batch proposal carries near-verbatim
 * bodies, so output volume tracks document size. A 1,419-word source needed
 * ~2,600 tokens and stopped dead on the cap (stop_reason=max_tokens,
 * output_tokens=2048, tool input returned empty). 8192 gives ~4x headroom,
 * covering documents to roughly 5,000 words.
 *
 * Not higher: at ~60 tok/s a 16384-token turn is a four-minute wait. The
 * batch fallback below handles documents past this ceiling instead.
 *
 * Billing is on tokens generated, not on the ceiling, so ordinary short
 * turns cost exactly what they did before.
 */
const BIOGRAPHER_MAX_TOKENS = 8192;

function isValidRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant';
}

type ValidatedRequest = { documentText: string; messages: MessageParam[] };

// ─── Truncated-turn detection (BIO-16) ────────────────────────────────────────

/**
 * Steering message for the one retry after a truncated batch proposal.
 *
 * Sent as an ordinary user turn on the RETRY REQUEST ONLY — never persisted to
 * the client transcript, and not a change to BIOGRAPHER_SYSTEM_PROMPT. The item
 * list it refers to is already in the transcript as plain text from the prior
 * successful turn, so the model does not need it repeated here.
 */
const HALVE_BATCH_STEER =
  'Your previous response was cut off because the batch was too large to return in one turn. ' +
  'Propose only the first half of the kinlooms you identified, in a single split_into_multiple call, ' +
  'and set final_batch to false so the remaining ones can follow in a later batch. ' +
  'Do not shorten or alter the kinlooms you do include.';

type ToolUseBlock = Extract<Anthropic.Messages.ContentBlock, { type: 'tool_use' }>;

function findToolUse(content: Anthropic.Messages.ContentBlock[]): ToolUseBlock | null {
  for (const block of content) {
    if (block.type === 'tool_use') return block as ToolUseBlock;
  }
  return null;
}

/**
 * True when a tool_use carries nothing the client can render.
 *
 * When generation hits `max_tokens` mid-tool_use the API returns the block with
 * an EMPTY input — not a partial object — so there is no salvageable content and
 * no client-side guard can reconstruct it. We also reject an input whose
 * required fields are missing, which is the same class of failure arriving by a
 * different route.
 */
function toolUseIsUnusable(block: ToolUseBlock): boolean {
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
 * `max_tokens` is also broken, but halving a batch is the wrong remedy for it —
 * steering it here would answer a truncated explanation with an instruction
 * about kinloom batches. That case is left alone.
 */
function turnIsTruncated(response: Anthropic.Messages.Message): boolean {
  const toolUse = findToolUse(response.content);
  if (!toolUse) return false;
  return toolUseIsUnusable(toolUse);
}

/** Count of proposed items on a batch turn, for logging. -1 when not determinable. */
function proposedCount(response: Anthropic.Messages.Message): number {
  const toolUse = findToolUse(response.content);
  if (!toolUse || toolUse.name !== 'split_into_multiple') return -1;
  const items = (toolUse.input as Record<string, unknown> | null)?.proposed_kinlooms;
  return Array.isArray(items) ? items.length : -1;
}

function validateRequest(
  body: unknown,
): { ok: true; data: ValidatedRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be a JSON object.' };
  }
  const { documentText, messages } = body as Record<string, unknown>;

  if (typeof documentText !== 'string' || !documentText.trim()) {
    return { ok: false, error: '`documentText` must be a non-empty string.' };
  }
  if (!Array.isArray(messages)) {
    return { ok: false, error: '`messages` must be an array.' };
  }
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return { ok: false, error: `messages[${i}] must be an object.` };
    }
    const { role, content } = m as Record<string, unknown>;
    if (!isValidRole(role)) {
      return { ok: false, error: `messages[${i}].role must be "user" or "assistant".` };
    }
    const contentIsString = typeof content === 'string' && content.trim().length > 0;
    const contentIsArray = Array.isArray(content) && content.length > 0;
    if (!contentIsString && !contentIsArray) {
      return {
        ok: false,
        error: `messages[${i}].content must be a non-empty string or content block array.`,
      };
    }
  }
  return { ok: true, data: { documentText: documentText.trim(), messages: messages as MessageParam[] } };
}

export async function POST(request: Request): Promise<NextResponse> {
  const space = await resolveActiveSpaceForRoute('agent/biographer');
  if (space.ok === false) {
    return NextResponse.json({ error: space.error }, { status: space.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const validated = validateRequest(raw);
  if (validated.ok === false) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { documentText, messages } = validated.data;

  const userTurns = messages.filter(m => m.role === 'user').length + 1; // +1 for the document turn
  if (userTurns > MAX_TURNS) {
    return NextResponse.json(
      { error: `Conversation has reached the maximum length (${MAX_TURNS} turns). Please start a new session.` },
      { status: 400 },
    );
  }

  // Build the full message array. The document is always the first user
  // message, cached. Subsequent conversation turns follow after it.
  const documentBlock: Anthropic.Messages.TextBlockParam = {
    type: 'text',
    text: documentText,
    cache_control: { type: 'ephemeral' },
  };

  const fullMessages: Anthropic.Messages.MessageParam[] = [
    { role: 'user', content: [documentBlock] },
    ...messages,
  ];

  try {
    const client = getAnthropicClient();
    const ask = (msgs: Anthropic.Messages.MessageParam[]) =>
      client.messages.create({
        model: BIOGRAPHER_MODEL,
        max_tokens: BIOGRAPHER_MAX_TOKENS,
        system: [
          {
            type: 'text',
            text: BIOGRAPHER_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: BIOGRAPHER_TOOLS,
        messages: msgs,
      });

    let response = await ask(fullMessages);

    console.log(
      `[agent/biographer] stop_reason=${response.stop_reason} output_tokens=${response.usage.output_tokens}`,
    );

    // ── Truncated-batch fallback (BIO-16) ───────────────────────────────────
    // A turn that hit the output ceiling comes back with an empty tool input.
    // Retry server-side with a smaller batch so the failed turn never reaches
    // the browser at all: it is neither returned nor included in the retry, so
    // an unanswered tool_use can never be persisted to sessionStorage. The
    // poisoning problem is designed out rather than cleaned up afterwards.
    let usedFallback = false;
    if (turnIsTruncated(response)) {
      const firstAttempt = response;
      const retryMessages: Anthropic.Messages.MessageParam[] = [
        ...fullMessages,
        { role: 'user', content: HALVE_BATCH_STEER },
      ];

      response = await ask(retryMessages);
      usedFallback = true;

      console.log(
        `[agent/biographer] batch fallback: retries=1 ` +
          `first_stop_reason=${firstAttempt.stop_reason} ` +
          `first_output_tokens=${firstAttempt.usage.output_tokens} ` +
          `first_items=${proposedCount(firstAttempt)} ` +
          `retry_stop_reason=${response.stop_reason} ` +
          `retry_output_tokens=${response.usage.output_tokens} ` +
          `retry_items=${proposedCount(response)}`,
      );

      // One retry only. Each attempt is a full generation — the observed
      // failing turn ran 51.8s — so chaining them produces multi-minute waits.
      if (turnIsTruncated(response)) {
        console.error('[agent/biographer] batch fallback exhausted; returning batch_too_large');
        return NextResponse.json(
          {
            error:
              'That batch of kinlooms was too large. Reply and ask me to work through the document in smaller groups — a few at a time — and we can keep going from here.',
            code: 'batch_too_large',
          },
          { status: 422 },
        );
      }
    }

    // Invariant: never hand back final_batch true while items remain unproposed.
    // The fallback proposes a partial batch by construction, so this is forced
    // server-side rather than left to the model's compliance with the steer.
    if (usedFallback) {
      const toolUse = findToolUse(response.content);
      if (toolUse?.name === 'split_into_multiple') {
        (toolUse.input as Record<string, unknown>).final_batch = false;
      }
    }

    const result: ConverseResponse = {
      message: response.content,
      stop_reason: response.stop_reason ?? 'end_turn',
    };

    return NextResponse.json(result);
  } catch (err) {
    // A 400 means we sent Claude a malformed conversation (e.g. a dangling
    // tool_use). That is our bug, not an upstream outage — retrying the same
    // payload fails identically — so surface it distinctly instead of masking
    // it as "unavailable / try again".
    const status = (err as { status?: number } | null)?.status;
    if (status === 400) {
      console.error('[agent/biographer] Malformed request to Claude API (400):', err);
      return NextResponse.json(
        { error: 'This conversation hit a snag and can’t continue. Please start over.' },
        { status: 422 },
      );
    }
    console.error('[agent/biographer] Claude API error:', err);
    return NextResponse.json(
      { error: 'The Biographer is unavailable. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
