/**
 * POST /api/agent/converse
 *
 * Stateless conversation endpoint for the Talk creation mode. The
 * client owns the full message history and sends it on every turn.
 * The route authenticates via the Firebase session cookie, validates
 * the request, and forwards the conversation to Claude.
 *
 * Response shape: { message: ContentBlock[]; stop_reason: string }
 * The client dispatches on stop_reason === 'tool_use' and the tool
 * name to decide whether to render the Shaping card.
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { resolveActiveSpaceForRoute } from '../../../../lib/server/auth';
import { getAnthropicClient, AGENT_MODEL, AGENT_MAX_TOKENS, AGENT_EFFORT } from '../../../../lib/agent/client';
import { SYSTEM_PROMPT } from '../../../../lib/agent/system-prompt';
import { CONVERSE_TOOLS } from '../../../../lib/agent/tools';
import { isEmptyContent } from '../../../../lib/agent/content';
import { findToolUse, turnIsTruncated } from '../../../../lib/agent/truncation';
import { MAX_TURNS, type ConverseRequest, type ConverseResponse } from '../../../../lib/agent/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Steering message for the one retry after a truncated proposal.
 *
 * Sent as an ordinary user turn on the RETRY REQUEST ONLY — never persisted
 * to the client transcript, and not a change to SYSTEM_PROMPT.
 */
const SHORTEN_DRAFT_STEER =
  'Your previous response was cut off because it was too long to return in one turn. ' +
  'Propose the same kinloom again in a single tool call, keeping the body to the essential ' +
  'material in the user\'s own words. Do not add new details and do not shorten it into ' +
  'fragments — write complete sentences.';

function isValidRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant';
}

/** Returns an error string, or null if the body is valid. */
function validateRequest(body: unknown): { messages: ConverseRequest['messages']; error: null } | { messages: null; error: string } {
  if (!body || typeof body !== 'object') {
    return { messages: null, error: 'Request body must be a JSON object.' };
  }
  const { messages } = body as Record<string, unknown>;
  if (!Array.isArray(messages) || messages.length === 0) {
    return { messages: null, error: '`messages` must be a non-empty array.' };
  }
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      return { messages: null, error: `messages[${i}] must be an object.` };
    }
    const { role, content } = m as Record<string, unknown>;
    if (!isValidRole(role)) {
      return { messages: null, error: `messages[${i}].role must be "user" or "assistant".` };
    }
    // Rejects empty strings/arrays AND arrays whose only blocks are empty text
    // blocks — the latter passes a bare length check but Anthropic rejects it.
    if (isEmptyContent(content)) {
      return { messages: null, error: `messages[${i}].content must be a non-empty string or content block array.` };
    }
  }
  return { messages: messages as ConverseRequest['messages'], error: null };
}

export async function POST(request: Request): Promise<NextResponse> {
  const space = await resolveActiveSpaceForRoute('agent/converse');
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
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { messages } = validated;

  const userTurns = messages.filter(m => m.role === 'user').length;
  if (userTurns > MAX_TURNS) {
    return NextResponse.json(
      { error: `Conversation has reached the maximum length (${MAX_TURNS} turns). Please start a new session.` },
      { status: 400 },
    );
  }

  try {
    const client = getAnthropicClient();
    const ask = (msgs: ConverseRequest['messages']) =>
      client.messages.create({
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: CONVERSE_TOOLS,
        output_config: { effort: AGENT_EFFORT },
        messages: msgs,
      });

    let response = await ask(messages);

    // Every turn logs its stop_reason and output volume. `stop_reason=max_tokens`
    // on a PROSE turn is the mid-sentence-truncation signal — the tool_use case
    // is caught by the guard below, but a truncated question only shows up here.
    console.log(
      `[agent/converse] stop_reason=${response.stop_reason} output_tokens=${response.usage.output_tokens}`,
    );

    // ── Truncated-proposal fallback ─────────────────────────────────────────
    // A turn that hit the output ceiling comes back with an empty tool input.
    // Retry server-side so the failed turn never reaches the browser: it is
    // neither returned nor included in the retry, so an unanswered tool_use can
    // never be persisted to sessionStorage.
    if (turnIsTruncated(response)) {
      const firstAttempt = response;
      response = await ask([...messages, { role: 'user', content: SHORTEN_DRAFT_STEER }]);

      console.log(
        `[agent/converse] draft fallback: retries=1 ` +
          `first_stop_reason=${firstAttempt.stop_reason} ` +
          `first_output_tokens=${firstAttempt.usage.output_tokens} ` +
          `first_tool=${findToolUse(firstAttempt.content)?.name ?? 'none'} ` +
          `retry_stop_reason=${response.stop_reason} ` +
          `retry_output_tokens=${response.usage.output_tokens}`,
      );

      // One retry only. Each attempt is a full generation, so chaining them
      // produces multi-minute waits.
      if (turnIsTruncated(response)) {
        console.error('[agent/converse] draft fallback exhausted; returning draft_too_large');
        return NextResponse.json(
          {
            error:
              'That draft was too long to shape in one go. Reply and ask me to keep it to the heart of the story, and we can carry on from here.',
            code: 'draft_too_large',
          },
          { status: 422 },
        );
      }
    }

    const result: ConverseResponse = {
      message: response.content,
      stop_reason: response.stop_reason ?? 'end_turn',
    };

    return NextResponse.json(result);
  } catch (err) {
    // Surface the real upstream detail (status + Anthropic error body) before
    // collapsing to a generic client-facing message. Anthropic SDK errors carry
    // `status` and a structured `error`; log them so 502s are diagnosable.
    if (err instanceof Anthropic.APIError) {
      console.error('[agent/converse] Anthropic API error:', {
        status: err.status,
        name: err.name,
        message: err.message,
        error: err.error,
        requestId: err.requestID,
      });
    } else {
      console.error('[agent/converse] Claude API error:', err);
    }
    return NextResponse.json(
      { error: 'The agent is unavailable. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
