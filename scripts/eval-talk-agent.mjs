/**
 * Replay fixed transcripts through the Talk agent and assert on the turns it
 * returns. This is the regression check for the QA finding that the agent
 * answered in fragments rather than full sentences.
 *
 * Usage:
 *   node --experimental-strip-types scripts/eval-talk-agent.mjs [--runs=N] [--only=name] [--effort=low|medium|high|xhigh|max]
 *   npm run eval:talk
 *
 * It imports the REAL system prompt, tools, model and token ceiling from
 * lib/agent/. Never inline a copy of the prompt here — a copy drifts from the
 * one production uses and the eval quietly stops measuring anything.
 *
 * Scope: this exercises the model + prompt, not the /converse route. Auth,
 * request validation and the truncation-retry fallback are route concerns and
 * are not covered here.
 *
 * Turns are sampled, so a single run is a smoke test, not proof. Use --runs=5
 * before and after a prompt edit and compare pass rates.
 */
import { readFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '../lib/agent/system-prompt.ts';
import { CONVERSE_TOOLS } from '../lib/agent/tools.ts';
import { AGENT_MODEL, AGENT_MAX_TOKENS, AGENT_EFFORT } from '../lib/agent/client.ts';

// ─── Config ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const RUNS = Number(args.find(a => a.startsWith('--runs='))?.split('=')[1] ?? 1);
const ONLY = args.find(a => a.startsWith('--only='))?.split('=')[1] ?? null;
// Sweep the effort ladder without editing the route. Defaults to the value the
// route actually sends (AGENT_EFFORT), so an unflagged run mirrors production.
const EFFORT = args.find(a => a.startsWith('--effort='))?.split('=')[1] ?? AGENT_EFFORT;
// Fixtures run concurrently by default (fast). Latency measured that way is
// mostly contention between our own in-flight requests, so pass --serial when
// the timing numbers are what you care about.
const SERIAL = args.includes('--serial');

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  process.env[m[1]] ??= v;
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not found in environment or .env.local');
  process.exit(1);
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Each is a transcript ending on a user turn, representing an interview state
// where the fragment problem was observed or is likely.

const u = text => ({ role: 'user', content: text });
const a = text => ({ role: 'assistant', content: [{ type: 'text', text }] });

const FIXTURES = [
  {
    name: 'opening-vague',
    why: 'First substantive answer, gestured at but not landed.',
    messages: [u('I keep thinking about my grandmother lately.')],
  },
  {
    name: 'terse-user',
    why: 'User answers in fragments. The agent historically mirrored them.',
    messages: [
      u('My dad taught me to fish.'),
      a('Where did the two of you fish?'),
      u('Lake Chelan.'),
    ],
  },
  {
    name: 'mid-interview-detail',
    why: 'A moment is on the table; the next question should chase a detail.',
    messages: [
      u('The summer of 1978 was when everything changed for our family.'),
      a('What happened that summer?'),
      u('We lost the farm. Dad had to sell it at auction in August and we moved into town before school started.'),
    ],
  },
  {
    name: 'after-declined-draft',
    why: 'The declined-proposal branch. Must ask a question, never end empty.',
    messages: [
      u('My mother always kept a garden. She grew tomatoes and taught me to stake them.'),
      { role: 'assistant', content: [
        { type: 'text', text: 'Let me try shaping what you have so far.' },
        { type: 'tool_use', id: 'toolu_eval_1', name: 'propose_draft', input: {
          title: 'Staking Tomatoes', type_slug: 'tradition',
          body: 'My mother always kept a garden. She grew tomatoes and taught me to stake them.',
        } },
      ] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_eval_1', content:
        'The user declined this draft and wants to keep talking. The interview is active again. Do not call a tool yet. Ask exactly one more concrete question that continues the thread from what they last shared. Respond now with that single question; do not end your turn empty and do not hand off.' }] },
    ],
  },
  {
    name: 'sprawling',
    why: 'Two distinct moments. Should surface them via split_into_multiple.',
    expectTool: 'split_into_multiple',
    messages: [
      u("I want to write about the day we buried my father, and also about the argument he and I had in the car three years before that, which I never really got over."),
    ],
  },
  {
    name: 'photo-mention',
    why: 'Agent cannot see photos and must ask about meaning, not contents.',
    messages: [
      u('I found a photo of my parents on their wedding day. I want to keep it for my kids.'),
    ],
  },
];

// ─── Checks ───────────────────────────────────────────────────────────────────

const TERMINAL = /[.!?"'”’)]$/;
const FORBIDDEN = [
  'beautiful story', "i'd love to hear more", 'take your time',
  'what a wonderful', 'thank you for sharing', 'that must have been',
];
const EMOJI = /\p{Extended_Pictographic}/u;
/** Words that open an interrogative clause, for compound-question detection. */
const INTERROGATIVE = /^(what|where|when|who|whom|whose|why|how|which|did|do|does|was|were|is|are|had|has|have|can|could|would|will|should)\b/i;

function sentencesOf(text) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

/** Returns an array of failure strings; empty means the turn passed. */
function checkTurn({ text, stopReason, hasToolUse }) {
  const fails = [];

  if (stopReason === 'max_tokens') {
    fails.push('stop_reason=max_tokens (turn was truncated)');
  }

  if (!hasToolUse && !text) {
    fails.push('ended turn with no text and no tool call');
    return fails; // nothing further to check
  }
  if (!text) return fails; // tool-only turn: no prose to judge

  if (!TERMINAL.test(text)) {
    fails.push(`does not end with terminal punctuation: ...${JSON.stringify(text.slice(-40))}`);
  }
  if (/(\.\.\.|…)\s*$/.test(text)) {
    fails.push('ends in an ellipsis');
  }

  for (const s of sentencesOf(text)) {
    if (!/[.!?]["'”’)]?$/.test(s)) {
      fails.push(`unterminated sentence: ${JSON.stringify(s.slice(0, 60))}`);
    }
    if (s.split(/\s+/).length < 2) {
      fails.push(`one-word sentence: ${JSON.stringify(s)}`);
    }
  }

  // A compound question ("Where was it, and who was there?") carries ONE question
  // mark but makes two asks — the exact thing the prompt's one-question-per-turn
  // rule forbids. Counting '?' alone misses it.
  for (const s of sentencesOf(text)) {
    if (!s.includes('?')) continue;
    const clauses = s.split(/,?\s+\b(?:and|or)\b\s+/i);
    if (clauses.length < 2) continue;
    const opensAQuestion = c => INTERROGATIVE.test(c.trim());
    if (clauses.filter(opensAQuestion).length > 1) {
      fails.push(`compound question (two asks joined by and/or): ${JSON.stringify(s)}`);
    }
  }

  const questions = (text.match(/\?/g) ?? []).length;
  if (!hasToolUse && questions !== 1) {
    fails.push(`expected exactly 1 question, found ${questions}`);
  }
  if (hasToolUse && questions > 1) {
    fails.push(`tool lead-in carried ${questions} questions`);
  }

  if (/\*\*|^#{1,6}\s|^\s*[-*]\s+|^\s*\d+\.\s+/m.test(text)) {
    fails.push('contains markdown formatting');
  }
  if (EMOJI.test(text)) fails.push('contains emoji');

  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN) {
    if (lower.includes(phrase)) fails.push(`forbidden phrase: "${phrase}"`);
  }

  return fails;
}

/** Fixture-specific expectations layered on top of the universal checks. */
const EXTRA = {
  'after-declined-draft': ({ text, hasToolUse }) => {
    const f = [];
    if (hasToolUse) f.push('called a tool immediately after a declined draft');
    if (!(text ?? '').includes('?')) f.push('did not ask a question after a declined draft');
    return f;
  },
  'photo-mention': ({ text }) => {
    const f = [];
    if (/\b(the photo shows|in the (photo|picture|image),|i can see)\b/i.test(text ?? '')) {
      f.push('described photo contents it cannot see');
    }
    return f;
  },
};

// ─── Runner ───────────────────────────────────────────────────────────────────

const client = new Anthropic();

async function runOnce(fixture) {
  const startedAt = Date.now();
  const res = await client.messages.create({
    model: AGENT_MODEL,
    max_tokens: AGENT_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    tools: CONVERSE_TOOLS,
    messages: fixture.messages,
    output_config: { effort: EFFORT },
  });
  const elapsedMs = Date.now() - startedAt;

  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n').trim();
  const toolUse = res.content.find(b => b.type === 'tool_use') ?? null;
  const turn = { text, stopReason: res.stop_reason, hasToolUse: !!toolUse };

  const fails = [...checkTurn(turn), ...(EXTRA[fixture.name]?.(turn) ?? [])];
  return { ...turn, tool: toolUse?.name ?? null, outputTokens: res.usage.output_tokens, elapsedMs, fails };
}

const selected = ONLY ? FIXTURES.filter(f => f.name === ONLY) : FIXTURES;
if (selected.length === 0) {
  console.error(`No fixture named "${ONLY}". Available: ${FIXTURES.map(f => f.name).join(', ')}`);
  process.exit(1);
}

console.log(`Talk agent eval — model=${AGENT_MODEL} max_tokens=${AGENT_MAX_TOKENS} runs=${RUNS} effort=${EFFORT}`);
console.log(`prompt=${SYSTEM_PROMPT.length} chars, ${selected.length} fixture(s)\n`);

const jobs = selected.flatMap(f =>
  Array.from({ length: RUNS }, (_, i) => () =>
    runOnce(f).then(
      r => ({ fixture: f, run: i + 1, ...r }),
      err => ({ fixture: f, run: i + 1, fails: [`request failed: ${err.message}`], text: '', outputTokens: 0, elapsedMs: 0 }),
    ),
  ),
);

let results;
if (SERIAL) {
  results = [];
  for (const job of jobs) results.push(await job());
} else {
  results = await Promise.all(jobs.map(job => job()));
}

let passed = 0;
for (const r of results) {
  const ok = r.fails.length === 0;
  if (ok) passed++;
  const tag = ok ? 'PASS' : 'FAIL';
  const runLabel = RUNS > 1 ? ` run ${r.run}/${RUNS}` : '';
  console.log(`[${tag}] ${r.fixture.name}${runLabel}  (${r.outputTokens} tok${r.tool ? `, tool=${r.tool}` : ''})`);
  if (r.text) console.log(`       ${r.text.replace(/\n+/g, ' ')}`);
  for (const f of r.fails) console.log(`       ✗ ${f}`);
  console.log();
}

const ok = results.filter(r => r.elapsedMs > 0);
const mean = xs => (xs.reduce((n, x) => n + x, 0) / (xs.length || 1));
const median = xs => {
  const v = [...xs].sort((x, y) => x - y);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};

console.log(`effort=${EFFORT}  ${passed}/${results.length} turns passed`);

for (const f of selected.filter(x => x.expectTool)) {
  const turns = results.filter(r => r.fixture.name === f.name);
  const fired = turns.filter(r => r.tool === f.expectTool).length;
  const note = fired === 0 ? '  <-- never fired; check effort/prompt' : '';
  console.log(`  ${f.name}: ${f.expectTool} fired ${fired}/${turns.length}${note}`);
}
console.log(
  `  output tokens: mean ${mean(ok.map(r => r.outputTokens)).toFixed(1)}` +
  `   latency: median ${median(ok.map(r => r.elapsedMs))}ms, mean ${mean(ok.map(r => r.elapsedMs)).toFixed(0)}ms`,
);
process.exit(passed === results.length ? 0 : 1);
