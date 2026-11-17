/**
 * Unfinished Talk conversations, kept as Talk notes (`/me/talk-notes`).
 *
 * A note holds at most 280 characters, so a saved conversation is a summary,
 * not a transcript: a short title in the member's words and where they
 * stopped. Because notes go into Talk's context on every turn, Talk knows
 * about every saved conversation, on every device, without being told.
 *
 * One note per conversation, in a fixed format the rail can parse back:
 *
 *   Unfinished Talk conversation [k:ab12cd | 2026-11-17 | 3 answers]: <title> Stopped at: <where>
 *
 * `k:` is the conversation's key, so saving it again replaces its note instead
 * of adding one. Notes in any other format (facts Talk may save later) are
 * left exactly as they are by every write here.
 *
 * `PUT /me/talk-notes` replaces the whole set, so every write reads the
 * current set first and sends it back with only this conversation's note
 * changed. Privacy: never log a note or a transcript.
 */

import 'server-only';
import { serverApiFetch } from '../server/api';
import { getAnthropicClient, AGENT_MODEL } from './client';
import type { components } from '../api-schema/kinloom';
import type { MessageParam } from './types';

type TalkNotes = components['schemas']['TalkNotes'];

export type UnfinishedConversation = {
  /** The conversation's key (6 lowercase letters/digits). */
  key: string;
  title: string;
  stoppedAt: string;
  /** YYYY-MM-DD the summary was saved. */
  savedOn: string;
  answers: number;
};

export class NotesFullError extends Error {
  constructor(public readonly maxNotes: number) {
    super(`Talk can keep at most ${maxNotes} notes.`);
    this.name = 'NotesFullError';
  }
}

const PREFIX = 'Unfinished Talk conversation';
const NOTE_RE = /^Unfinished Talk conversation \[k:([a-z0-9]{6}) \| (\d{4}-\d{2}-\d{2}) \| (\d+) answers?\]: ([\s\S]*?)(?: Stopped at: ([\s\S]*))?$/;
const TITLE_MAX = 90;

export const isConversationKey = (key: unknown): key is string => typeof key === 'string' && /^[a-z0-9]{6}$/.test(key);

function clip(text: string, max: number): string {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

export function parseConversationNote(body: string): UnfinishedConversation | null {
  const m = NOTE_RE.exec(body.trim());
  if (!m) return null;
  return { key: m[1], savedOn: m[2], answers: Number(m[3]), title: m[4].trim(), stoppedAt: (m[5] ?? '').trim() };
}

export function formatConversationNote(c: UnfinishedConversation, maxChars: number): string {
  const head = `${PREFIX} [k:${c.key} | ${c.savedOn} | ${c.answers} ${c.answers === 1 ? 'answer' : 'answers'}]: `;
  const title = clip(c.title, TITLE_MAX);
  const base = `${head}${title}`;
  const room = maxChars - base.length - ' Stopped at: '.length;
  return c.stoppedAt && room > 20 ? `${base} Stopped at: ${clip(c.stoppedAt, room)}` : clip(base, maxChars);
}

async function readNotes(): Promise<TalkNotes> {
  return serverApiFetch<TalkNotes>('/me/talk-notes');
}

async function writeNotes(bodies: string[]): Promise<TalkNotes> {
  return serverApiFetch<TalkNotes>('/me/talk-notes', {
    method: 'PUT',
    body: { notes: bodies.map(body => ({ body })) },
  });
}

/** The member's unfinished conversations, newest saved first. */
export function conversationsFrom(notes: TalkNotes): UnfinishedConversation[] {
  return notes.notes
    .map(n => parseConversationNote(n.body))
    .filter((c): c is UnfinishedConversation => c !== null)
    .reverse(); // notes are oldest first; a re-save moves a note to the end
}

export async function listUnfinishedConversations(): Promise<UnfinishedConversation[]> {
  return conversationsFrom(await readNotes());
}

// ─── Summarising ───────────────────────────────────────────────────────────────

const SUMMARY_SYSTEM = `You write the label for an unfinished conversation in Kinloom, where a member is telling Talk (an interviewer) a story they want to keep for their family. The label is saved so they, and Talk, can pick the conversation back up later.

Return two things:
- title: what the story is about, in the member's own words and voice, as one plain sentence of at most ${TITLE_MAX} characters. For example: "The summer my grandfather taught me to fish off the pier at Lake Erie."
- stopped_at: where the conversation stopped, so Talk can pick it up, in at most 120 characters. Name what they had told and what was still untold. For example: "Had described the pier and Pop's tackle box; hadn't said what Pop taught him."

Use only what the member said. Do not add details, praise, or interpretation. If the transcript begins with a bracketed note about an earlier part of the conversation, include that earlier part in both fields.`;

function transcriptText(messages: MessageParam[]): string {
  const lines: string[] = [];
  for (const m of messages) {
    const speaker = m.role === 'user' ? 'Member' : 'Talk';
    if (typeof m.content === 'string') {
      lines.push(`${speaker}: ${m.content}`);
      continue;
    }
    for (const block of m.content as Array<{ type: string; text?: string; input?: unknown }>) {
      if (block.type === 'text' && block.text) lines.push(`${m.role === 'user' ? 'Note' : speaker}: ${block.text}`);
      if (block.type === 'tool_use') lines.push(`Talk proposed a draft: ${JSON.stringify(block.input).slice(0, 400)}`);
    }
  }
  return lines.join('\n');
}

export async function summariseConversation(messages: MessageParam[]): Promise<{ title: string; stoppedAt: string }> {
  const response = await getAnthropicClient().messages.create({
    model: AGENT_MODEL,
    max_tokens: 1024,
    system: SUMMARY_SYSTEM,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            stopped_at: { type: 'string' },
          },
          required: ['title', 'stopped_at'],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: 'user', content: `Transcript:\n\n${transcriptText(messages)}` }],
  });
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
    throw new Error(`summary stopped: ${response.stop_reason}`);
  }
  const text = response.content.find(b => b.type === 'text');
  const parsed = JSON.parse(text && text.type === 'text' ? text.text : '{}') as { title?: unknown; stopped_at?: unknown };
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  if (!title) throw new Error('summary had no title');
  return { title, stoppedAt: typeof parsed.stopped_at === 'string' ? parsed.stopped_at.trim() : '' };
}

// ─── Writes ────────────────────────────────────────────────────────────────────

/**
 * Save (or re-save) a conversation as its note. Every other note is sent back
 * unchanged, in order; this conversation's note moves to the end (newest).
 */
export async function saveUnfinishedConversation(
  key: string,
  messages: MessageParam[],
  answers: number,
): Promise<UnfinishedConversation[]> {
  const summary = await summariseConversation(messages);
  const current = await readNotes();
  const others = current.notes.map(n => n.body).filter(body => parseConversationNote(body)?.key !== key);
  if (others.length >= current.limits.max_notes) throw new NotesFullError(current.limits.max_notes);

  const note = formatConversationNote(
    { key, answers, savedOn: new Date().toISOString().slice(0, 10), ...summary },
    current.limits.max_note_chars,
  );
  return conversationsFrom(await writeNotes([...others, note]));
}

/** Remove a conversation's note; every other note is kept as it is. */
export async function discardUnfinishedConversation(key: string): Promise<UnfinishedConversation[]> {
  const current = await readNotes();
  const kept = current.notes.map(n => n.body).filter(body => parseConversationNote(body)?.key !== key);
  if (kept.length === current.notes.length) return conversationsFrom(current);
  return conversationsFrom(await writeNotes(kept));
}
