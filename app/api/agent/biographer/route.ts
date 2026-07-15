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
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getAnthropicClient } from '../../../../lib/agent/client';
import { BIOGRAPHER_TOOLS } from '../../../../lib/agent/tools';
import { BIOGRAPHER_SYSTEM_PROMPT } from '../../../../lib/biographer/system-prompt';
import { MAX_TURNS, type MessageParam, type ConverseResponse } from '../../../../lib/agent/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BIOGRAPHER_MODEL = 'claude-sonnet-4-6';
const BIOGRAPHER_MAX_TOKENS = 2048;

function isValidRole(role: unknown): role is 'user' | 'assistant' {
  return role === 'user' || role === 'assistant';
}

type ValidatedRequest = { documentText: string; messages: MessageParam[] };

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
    const response = await client.messages.create({
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
      messages: fullMessages,
    });

    const result: ConverseResponse = {
      message: response.content,
      stop_reason: response.stop_reason ?? 'end_turn',
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[agent/biographer] Claude API error:', err);
    return NextResponse.json(
      { error: 'The Biographer is unavailable. Please try again in a moment.' },
      { status: 502 },
    );
  }
}
