/**
 * POST /api/legacy-chat
 *
 * Body: { familySpaceId, memberId, question, sealed }
 *
 * Curator-style answer grounded in the named member's real kinlooms.
 * Source of truth is the Laravel API (we fetch the member's library
 * server-side using the caller's HttpOnly cookie), so no mock data is
 * involved.
 *
 * NOTE: this is a "Phase 2" deliverable per the epic; this version is
 * intentionally minimal — no conversation persistence, no rate limit.
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import {
  bodyParagraphs,
  type LibraryRow,
  type Kinloom,
} from '../../../lib/kinloom';
import { serverApiFetch, ApiError } from '../../../lib/server/api';
import { getActiveSpaceId } from '../../../lib/server/auth';
import { getMemberProfile } from '../../../lib/server/queries';

const client = new Anthropic();

type Body = {
  memberId?: unknown;
  question?: unknown;
  sealed?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { memberId, question, sealed } = body;
  if (typeof memberId !== 'string' || !memberId) {
    return NextResponse.json({ error: 'memberId is required' }, { status: 422 });
  }
  if (typeof question !== 'string' || !question.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 422 });
  }

  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) {
    return NextResponse.json({ error: 'No active family space.' }, { status: 400 });
  }

  let kinlooms: LibraryRow[] = [];
  let memberName = 'this person';
  try {
    const profile = await getMemberProfile(familySpaceId, memberId);
    memberName = profile.member.name;
    // Hydrate full bodies for the rows we want to include in the corpus.
    // Library rows only carry excerpts; for grounded answers we want the
    // full text where available. Cap at 20 to keep prompt size sane.
    const rows = profile.kinlooms.slice(0, 20);
    const fulls = await Promise.all(rows.map(async row => {
      try {
        const full = await serverApiFetch<Kinloom>(
          `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(row.ulid)}`,
        );
        return { row, full };
      } catch {
        return { row, full: null as Kinloom | null };
      }
    }));
    kinlooms = fulls.map(({ row, full }) => ({
      ...row,
      body_paragraphs: full?.body_paragraphs ?? [],
      author: row.author ?? full?.author ?? null,
    } as LibraryRow & { body_paragraphs: unknown }));
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }
    return NextResponse.json(
      { body: 'Something went quiet. The vault is here — try again in a moment.', sources: [], error: true },
      { status: 502 },
    );
  }

  if (kinlooms.length === 0) {
    return NextResponse.json({
      body: `${memberName} hasn't deposited any kinlooms yet. Once they do, you'll be able to ask questions grounded in what they kept.`,
      sources: [],
    });
  }

  const corpus = kinlooms
    .map(k => {
      const author = k.author?.name || 'them';
      const date = k.created_at ? new Date(k.created_at).toLocaleDateString() : '';
      const paragraphs = bodyParagraphs((k as Kinloom).body_paragraphs);
      return `[id:${k.ulid}] [${k.type_slug}] "${k.title || 'Untitled'}" — by ${author} (${date})\n${paragraphs.join('\n\n') || k.excerpt || ''}`;
    })
    .join('\n\n---\n\n');

  const voiceInstr = sealed
    ? `Speak ABOUT ${memberName} (third person, past tense), as if they are no longer here and you are helping a descendant understand who they were.`
    : `Speak as a CURATOR of ${memberName}'s kinlooms. Don't speak AS them. Use phrases like "From what's been kept here…", "In a kinloom from March, they wrote…".`;

  const prompt = `You are the AI Legacy Bank — a quiet, careful curator of ${memberName}'s preserved memories ("kinlooms"). You answer questions ONLY by drawing on the kinlooms below. You never invent details, never put words in anyone's mouth, never speculate beyond what the kinlooms contain.

${voiceInstr}

Tone: warm, slow, contemplative. Short, true sentences. Avoid lists, bullets, headers, markdown. Avoid the word "I" referring to yourself. Length: 2–4 sentences. End by naming, in your final sentence, which kinloom(s) you drew from naturally.

If the kinlooms don't contain what's needed to answer, say so simply and suggest what kind of memory the user could deposit to make a future answer possible.

After your prose answer, on a new line, output a single line in this exact format with the IDs of kinlooms you drew from:
SOURCES: id1, id2

THE KINLOOMS:

${corpus}

QUESTION: ${question}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const reply = (message.content[0] as { type: 'text'; text: string }).text;
    let answer = reply;
    let sources: string[] = [];
    const match = reply.match(/SOURCES:\s*([a-z0-9,\s_-]+)/i);
    if (match) {
      answer = reply.replace(match[0], '').trim();
      sources = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => kinlooms.some(k => k.ulid === s));
    }

    return NextResponse.json({ body: answer, sources });
  } catch (err) {
    console.error('Legacy chat error:', err);
    return NextResponse.json(
      { body: 'Something went quiet. The vault is here — try again in a moment.', sources: [], error: true },
      { status: 500 },
    );
  }
}
