import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic();

const SHAPING_SYSTEM = `You are the Kinloom shaper. Your job is to take raw conversational material or a written draft and shape it into a finished kinloom — a short, true personal memory, lesson, belief, message, tradition, milestone, reflection, or guide.

Voice rules for the shaped body:
- Write in the first person, in the user's voice, as if they wrote it themselves.
- Use the specific details from the source. Do not invent details.
- The body should be 2–5 short paragraphs. No more than ~200 words.
- Prose only — no lists, no headers, no markdown.
- Warm, literary, honest. Concise.

For the title: short, evocative, specific. Not a summary. Something that would make the reader want to read it.
For the type: one of: story, lesson, belief, message, tradition, milestone, reflection, photo-collection`;

type TalkTurn = { role: 'agent' | 'user'; text: string };

export async function POST(request: Request) {
  const { from, conversation, draft, mode = 'shape', instruction, currentDraft } = await request.json();

  try {
    let sourceText = '';
    if (from === 'talk' && conversation) {
      sourceText = (conversation as TalkTurn[])
        .map(t => `${t.role === 'agent' ? 'AGENT' : 'USER'}: ${t.text}`)
        .join('\n\n');
    } else if (draft) {
      sourceText = `Title: ${draft.title || '(untitled)'}\n\n${draft.body || ''}`;
    }

    let prompt = '';
    if (mode === 'refine' && instruction && currentDraft) {
      prompt = `${SHAPING_SYSTEM}

The user has shaped their material into this kinloom:
  title: ${currentDraft.title}
  type:  ${currentDraft.type}
  body:  ${currentDraft.body}

They want to refine it with this instruction: "${instruction}"

Apply their request. Keep voice, facts, and spirit. Do not invent details.
Return ONLY a JSON object: {"title":"…","type":"…","body":"…"}.

ORIGINAL SOURCE (so you do not lose facts):

${sourceText}`;
    } else {
      prompt = `${SHAPING_SYSTEM}

MATERIAL:

${sourceText}

Return ONLY a single JSON object, no prose, no markdown fence.
If the material contains ONE clear kinloom, return:
{"kind":"single","title":"…","type":"story|lesson|belief|message|tradition|milestone|reflection|photo-collection","body":"…"}.
If it clearly contains TWO OR THREE distinct kinlooms that should not be merged, return:
{"kind":"split","kinlooms":[{"title":"…","type":"…","summary":"… one sentence …"},…]}.
Default to "single" unless splitting is genuinely warranted.`;
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (msg.content[0] as { type: 'text'; text: string }).text.trim();

    // Parse JSON, handling markdown fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Kinloom shaper error:', err);
    // Graceful fallback
    return NextResponse.json({
      kind: 'single',
      title: draft?.title || 'Untitled',
      type: draft?.type || 'story',
      body: draft?.body || '',
    });
  }
}
