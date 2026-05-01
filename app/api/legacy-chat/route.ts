import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { KINLOOMS, MEMBER_MAP } from '../../lib/mock-data';

const client = new Anthropic();

export async function POST(request: Request) {
  const { question, sealed } = await request.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const corpus = KINLOOMS.map(k => {
    const author = MEMBER_MAP[k.author];
    return `[id:${k.id}] [${k.type}] "${k.title}" — by ${author?.name || k.author} (${k.date})\n${k.body}`;
  }).join('\n\n---\n\n');

  const voiceInstr = sealed
    ? `Speak ABOUT the family members (third person, past tense), as if they are no longer here and you are helping a descendant understand who they were. Examples: "She believed...", "He often said...", "From what they kept here..."`
    : `Speak as a CURATOR of the family's kinlooms. Don't speak AS any family member. Use phrases like "From what's been kept here...", "In a kinloom from March, they wrote...", "Eleanor's story about the frozen river says..."`;

  const prompt = `You are the AI Legacy Bank — a quiet, careful curator of a family's preserved memories ("kinlooms"). You answer questions ONLY by drawing on the kinlooms below. You never invent details, never put words in anyone's mouth, never speculate beyond what the kinlooms contain.

${voiceInstr}

Tone: warm, slow, contemplative. Use serif-style sentences — short, true ones. Avoid lists, bullet points, headers, markdown. Avoid the phrase "I" referring to yourself. Length: 2–4 sentences. End by naming, in your final sentence, which kinloom(s) you drew from naturally — e.g. "(from 'Sunday bread', by Mira, March 8)".

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

    let body = reply;
    let sources: string[] = [];
    const match = reply.match(/SOURCES:\s*([a-z0-9,\s]+)/i);
    if (match) {
      body = reply.replace(match[0], '').trim();
      sources = match[1]
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => KINLOOMS.some(k => k.id === s));
    }

    return NextResponse.json({ body, sources });
  } catch (err) {
    console.error('Legacy chat error:', err);
    return NextResponse.json(
      { body: 'Something went quiet. The vault is here — try again in a moment.', sources: [], error: true },
      { status: 500 }
    );
  }
}
