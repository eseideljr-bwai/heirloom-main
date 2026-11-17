/**
 * Unfinished Talk conversations, stored as Talk notes (see
 * lib/agent/conversation-notes.ts).
 *
 *   GET  /api/agent/conversations                          → { conversations }
 *   POST /api/agent/conversations { action: "save", key, messages, answers }
 *   POST /api/agent/conversations { action: "discard", key }
 *
 * Every response is { conversations: UnfinishedConversation[] }, newest first.
 * Never log a note or a transcript: only statuses and error names.
 */

import { NextResponse } from 'next/server';
import { ApiError } from '../../../../lib/api';
import { resolveActiveSpaceForRoute } from '../../../../lib/server/auth';
import {
  NotesFullError,
  discardUnfinishedConversation,
  isConversationKey,
  listUnfinishedConversations,
  saveUnfinishedConversation,
} from '../../../../lib/agent/conversation-notes';
import { isEmptyContent } from '../../../../lib/agent/content';
import { MAX_TURNS, type MessageParam } from '../../../../lib/agent/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = 'agent/conversations';

function failure(err: unknown, action: 'list' | 'save' | 'discard'): NextResponse {
  if (err instanceof NotesFullError) {
    return NextResponse.json(
      {
        error: `Talk is already keeping ${err.maxNotes} things for you. Discard an unfinished conversation to save this one.`,
        code: 'notes_full',
      },
      { status: 409 },
    );
  }
  const status = err instanceof ApiError ? err.status : 'n/a';
  console.error(`[${ROUTE}] failed: status=${status} error=${err instanceof Error ? err.name : 'unknown'}`);
  if (err instanceof ApiError && err.status === 429) {
    return NextResponse.json({ error: 'Too many requests right now. Please try again in a moment.' }, { status: 429 });
  }
  const message = {
    list: 'Couldn’t load your unfinished conversations. Please try again.',
    save: 'Couldn’t save this conversation. Please try again.',
    discard: 'Couldn’t discard that conversation. Please try again.',
  }[action];
  return NextResponse.json({ error: message }, { status: 502 });
}

export async function GET(): Promise<NextResponse> {
  const auth = await resolveActiveSpaceForRoute(ROUTE);
  if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json({ conversations: await listUnfinishedConversations() });
  } catch (err) {
    return failure(err, 'list');
  }
}

function validMessages(value: unknown): value is MessageParam[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_TURNS * 4 &&
    value.every(
      m =>
        !!m &&
        typeof m === 'object' &&
        ((m as MessageParam).role === 'user' || (m as MessageParam).role === 'assistant') &&
        !isEmptyContent((m as MessageParam).content),
    )
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await resolveActiveSpaceForRoute(ROUTE);
  if (auth.ok === false) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!isConversationKey(body.key)) {
    return NextResponse.json({ error: '`key` must be 6 lowercase letters or digits.' }, { status: 400 });
  }

  try {
    if (body.action === 'discard') {
      return NextResponse.json({ conversations: await discardUnfinishedConversation(body.key) });
    }
    if (body.action === 'save') {
      if (!validMessages(body.messages)) {
        return NextResponse.json({ error: '`messages` must be a non-empty conversation.' }, { status: 400 });
      }
      const answers = typeof body.answers === 'number' && body.answers >= 0 ? Math.floor(body.answers) : 0;
      return NextResponse.json({
        conversations: await saveUnfinishedConversation(body.key, body.messages, answers),
      });
    }
    return NextResponse.json({ error: '`action` must be "save" or "discard".' }, { status: 400 });
  } catch (err) {
    return failure(err, body.action === 'discard' ? 'discard' : 'save');
  }
}
