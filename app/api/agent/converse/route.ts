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

import { NextResponse } from 'next/server';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getAnthropicClient, AGENT_MODEL, AGENT_MAX_TOKENS } from '../../../../lib/agent/client';
import { SYSTEM_PROMPT } from '../../../../lib/agent/system-prompt';
import { CONVERSE_TOOLS } from '../../../../lib/agent/tools';
import { MAX_TURNS, type ConverseRequest, type ConverseResponse } from '../../../../lib/agent/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const contentIsString = typeof content === 'string' && content.trim().length > 0;
    const contentIsArray = Array.isArray(content) && content.length > 0;
    if (!contentIsString && !contentIsArray) {
      return { messages: null, error: `messages[${i}].content must be a non-empty string or content block array.` };
    }
  }
  return { messages: messages as ConverseRequest['messages'], error: null };
}

export async function POST(request: Request): Promise<NextResponse> {
  const spaceId = await getActiveSpaceId();
  if (!spaceId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
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
    const response = await client.messages.create({
      model: AGENT_MODEL,
      max_tokens: AGENT_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: CONVERSE_TOOLS,
      messages,
    });

    const result: ConverseResponse = {
      message: response.content,
      stop_reason: response.stop_reason ?? 'end_turn',
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[agent/converse] Claude API error:', err);
    return NextResponse.json(
      { error: 'The agent is unavailable. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
