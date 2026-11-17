/**
 * Probe the Talk memory endpoints for one account.
 *
 *   GET    /me/talk-context   what Talk knows (JSON + the `prompt` block)
 *   GET    /me/talk-notes     the saved notes and their limits
 *
 * Usage:
 *   node scripts/probe-talk-context.mjs <email>                 read only
 *   node scripts/probe-talk-context.mjs <email> --ask "<first message>"
 *   node scripts/probe-talk-context.mjs <email> --notes-roundtrip
 *
 * --ask sends <first message> as a Talk conversation's opening user turn, with
 * the real system prompt, tools and model settings, and the member's live
 * talk-context block appended exactly as /api/agent/converse does. Read only.
 *
 * --notes-roundtrip also exercises PUT and DELETE /me/talk-notes. Because PUT
 * replaces the whole set, it refuses to run unless the account has NO notes:
 * it writes two test notes, reads them back through talk-context, then
 * DELETEs, leaving the account as it found it.
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const email = process.argv[2];
const roundtrip = process.argv.includes('--notes-roundtrip');
if (!email || email.startsWith('--')) {
  console.error('usage: node scripts/probe-talk-context.mjs <email> [--notes-roundtrip]');
  process.exit(1);
}

const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[m[1]] = v;
}

const API = (env.KINLOOM_API_URL || 'https://kinloom-api-laravel-vycjbweb.on-forge.com/api').replace(/\/$/, '');

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const user = await getAuth().getUserByEmail(email);
const customToken = await getAuth().createCustomToken(user.uid);
const exch = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(env.NEXT_PUBLIC_FIREBASE_API_KEY)}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
if (!exch.ok) {
  console.error('Identity Toolkit exchange failed:', exch.status, await exch.text());
  process.exit(1);
}
const { idToken } = await exch.json();

async function call(method, path, body) {
  const started = Date.now();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  console.log(`\n${method} ${path} -> ${res.status} (${Date.now() - started}ms)`);
  return { status: res.status, data };
}

console.log(`API: ${API}`);

// ── Read ─────────────────────────────────────────────────────────────────────
const ctx = await call('GET', '/me/talk-context');
if (ctx.status !== 200) {
  console.log(ctx.data);
  process.exit(1);
}
const { prompt, ...structured } = ctx.data;
console.log(JSON.stringify(structured, null, 2));
console.log(`\n--- prompt (${prompt.length} chars) ---\n${prompt}\n--- end prompt ---`);

const notes = await call('GET', '/me/talk-notes');
console.log(JSON.stringify(notes.data, null, 2));

// ── First Talk turn with the context loaded ─────────────────────────────────
const askIdx = process.argv.indexOf('--ask');
if (askIdx !== -1) {
  const first = process.argv[askIdx + 1];
  if (!first) {
    console.error('--ask needs a message');
    process.exit(1);
  }
  process.env.ANTHROPIC_API_KEY ||= env.ANTHROPIC_API_KEY;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const { SYSTEM_PROMPT } = await import('../lib/agent/system-prompt.ts');
  const { CONVERSE_TOOLS } = await import('../lib/agent/tools.ts');
  const { AGENT_MODEL, AGENT_MAX_TOKENS, AGENT_EFFORT } = await import('../lib/agent/client.ts');

  const started = Date.now();
  const res = await new Anthropic().messages.create({
    model: AGENT_MODEL,
    max_tokens: AGENT_MAX_TOKENS,
    system: [
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: prompt },
    ],
    tools: CONVERSE_TOOLS,
    output_config: { effort: AGENT_EFFORT },
    messages: [{ role: 'user', content: first }],
  });
  console.log(`\n--- Talk, first turn (${Date.now() - started}ms, stop=${res.stop_reason}) ---`);
  console.log(`member: ${first}`);
  for (const block of res.content) {
    if (block.type === 'text') console.log(`talk:   ${block.text}`);
    else if (block.type === 'tool_use') console.log(`talk:   [${block.name}] ${JSON.stringify(block.input)}`);
  }
  console.log(
    `usage: input=${res.usage.input_tokens} cache_write=${res.usage.cache_creation_input_tokens} ` +
      `cache_read=${res.usage.cache_read_input_tokens} output=${res.usage.output_tokens}`,
  );
}

if (!roundtrip) process.exit(0);

// ── Write round-trip (only on an account with no notes) ──────────────────────
if (!Array.isArray(notes.data?.notes)) {
  console.error('\nRefusing --notes-roundtrip: could not read the current notes.');
  process.exit(1);
}
if (notes.data.notes.length > 0) {
  console.error(
    `\nRefusing --notes-roundtrip: this account already has ${notes.data.notes.length} note(s), ` +
      'and PUT would replace them.',
  );
  process.exit(1);
}

const put = await call('PUT', '/me/talk-notes', {
  notes: [{ body: 'PROBE: prefers to be called by first name.' }, { body: 'PROBE: second test note.' }],
});
console.log(JSON.stringify(put.data, null, 2));

const after = await call('GET', '/me/talk-context');
console.log('notes in talk-context:', JSON.stringify(after.data?.notes, null, 2));
const promptShowsNotes = typeof after.data?.prompt === 'string' && after.data.prompt.includes('PROBE: second test note.');
console.log(`prompt includes the notes: ${promptShowsNotes}`);

const tooLong = await call('PUT', '/me/talk-notes', { notes: [{ body: 'x'.repeat(281) }] });
console.log('over-limit PUT (expect 422):', JSON.stringify(tooLong.data));

const del = await call('DELETE', '/me/talk-notes');
console.log(JSON.stringify(del.data, null, 2));
