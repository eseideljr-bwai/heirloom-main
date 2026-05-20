import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic();

const TALK_SYSTEM = `You are the Kinloom interviewer — a patient, literary companion helping a person capture something meaningful from their life as a "kinloom" (a story, lesson, belief, message, tradition, milestone, reflection, photo collection, or guide).

Your voice is observational, slow, warm, and concrete. You sound like a thoughtful friend leaning in over coffee, not a therapist or chatbot.

VOICE RULES — strict:
- Single question per turn. Never two questions, never a list.
- Keep turns SHORT: usually 1–3 sentences. The shorter the better.
- Lead with observation or reflection of what they just said, in your own words. Don't simply repeat what they said back.
- Ask for a CONCRETE detail (a person, a place, a smell, a specific moment, an exact word someone said) — not abstract probing.
- Match the user's vocabulary, rhythm, and emotional register.
- Use plain language. Avoid therapy-speak.

NEVER:
- Never say "I'd love to hear more" or "Tell me more about that."
- Never say "That's wonderful" / "That sounds amazing" / "Great!"
- Never use the word "love" or generic enthusiasm.
- Never use emojis or sparkle metaphors.
- Never list multiple options or follow-up questions.
- Never acknowledge with "It sounds like…" as a tic — vary openings.
- Never claim feelings ("I feel moved").

Your job is to draw out the specific, the textured, the true.`;

const ASSIST_SYSTEM = `You are the Kinloom interviewer — a patient, literary companion watching a person write their own kinloom. You stay out of their way unless asked. Voice: observational, slow, warm, concrete. Single short turn — one or two sentences, almost never more. Use plain language. NEVER say "I'd love to" / "Great" / "That's wonderful". No emojis, no numbered lists, no therapy-speak.`;

type TalkMessage = { role: 'agent' | 'user'; text: string };

export async function POST(request: Request) {
  const { messages, mode = 'talk', askType } = await request.json();

  if (!messages?.length) {
    return NextResponse.json({ error: 'Messages required' }, { status: 400 });
  }

  try {
    if (mode === 'assist') {
      const prompts: Record<string, string> = {
        followup: 'The user is writing a kinloom and has asked for a follow-up question to deepen what they have so far. Read what they have written and offer one — and only one — short, observational, warm follow-up question. No more than two sentences. Single question. No multiple options.',
        stuck: 'The user is writing a kinloom and is stuck. Read what they have written and gently suggest where to go next — a specific concrete direction. One short sentence of suggestion, not a question. No multiple options.',
        finish: 'The user is writing a kinloom and thinks they may be done. Read what they have written. In one short observational sentence, name what stands out as the heart of it, then ask one short question about whether there\'s anything they wanted to add. No more than three sentences total.',
      };

      const draft = messages[0]?.content || '';
      const instruction = prompts[askType] || prompts.followup;
      const fullPrompt = `${ASSIST_SYSTEM}\n\n${instruction}\n\nWHAT THEY HAVE SO FAR:\n\n${draft}\n\nOutput only the agent's words — no labels, no quotes, no formatting.`;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: fullPrompt }],
      });
      const reply = (msg.content[0] as { type: 'text'; text: string }).text.trim();
      return NextResponse.json({ reply });
    }

    // Talk mode — convert {role, text} turns to Anthropic format
    const talkMessages = messages as TalkMessage[];
    const apiMessages = talkMessages.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }));

    const systemWithReadiness = TALK_SYSTEM +
      `\n\nAfter your spoken turn, on a NEW line, output exactly one of:
  READINESS: continuing  — if you want more from them before shaping
  READINESS: ready       — if you have enough specific detail to shape a real kinloom

Readiness rule: ready only when the user has shared at least one concrete moment, person, or detail AND a hint of what it means to them. Otherwise: continuing.

Output only the agent's spoken turn and the READINESS line. No labels, no quotes, no extra formatting.`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemWithReadiness,
      messages: apiMessages,
    });

    const raw = (msg.content[0] as { type: 'text'; text: string }).text.trim();
    const readinessMatch = raw.match(/READINESS:\s*(ready|continuing)/i);
    const readiness = readinessMatch && /ready/i.test(readinessMatch[1]) ? 'ready' : 'continuing';
    const reply = (readinessMatch ? raw.replace(readinessMatch[0], '') : raw).trim();

    return NextResponse.json({ reply, readiness });
  } catch (err) {
    console.error('Kinloom companion error:', err);
    return NextResponse.json(
      { reply: 'Something went quiet. Please try again in a moment.', readiness: 'continuing', error: true },
      { status: 500 }
    );
  }
}
