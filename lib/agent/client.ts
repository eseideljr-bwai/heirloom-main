import Anthropic from '@anthropic-ai/sdk';

export const AGENT_MODEL = 'claude-opus-4-7';
/**
 * Output ceiling for a Talk turn.
 *
 * 1024 was too tight: the cap covers the conversational text AND the
 * propose_draft tool input (title + type_slug + body + confidence_notes), so
 * a draft body of a few paragraphs stopped dead on the ceiling — returning a
 * mid-sentence reply, or a tool_use with an empty input. That surfaced in QA
 * as the agent "not responding in full sentences."
 *
 * 4096 covers one question plus one full draft with room to spare. Not
 * higher: a Talk turn is a single question or a single kinloom, never a
 * batch — the Biographer needs 8192 because its output volume tracks
 * document size, and this one does not.
 *
 * Billing is on tokens generated, not on the ceiling, so ordinary short
 * turns cost exactly what they did before.
 */
export const AGENT_MAX_TOKENS = 4096;

/**
 * Reasoning effort for a Talk turn.
 *
 * `high` is also Opus 4.7's default, so this pins current behaviour rather
 * than changing it. It is set explicitly because the default is a property of
 * the model, not of this app: effort defaults have already moved between model
 * generations, so an unpinned value means a future AGENT_MODEL bump silently
 * re-tunes the interview.
 *
 * Measured before choosing (scripts/eval-talk-agent.mjs, 6 fixtures):
 *   - low     — DISQUALIFIED. split_into_multiple fired 0/4 on sprawling
 *               material; the agent asked "which one first?" in prose instead,
 *               so the split picker never renders and the user loses the
 *               reviewable batch. Sentence-level checks all still passed,
 *               which is why this is recorded here and not just inferred.
 *   - medium  — no measurable gain over high: tool firing 3/4 vs 3/4, latency
 *               difference inside the noise at this sample size.
 *   - high    — 18/18 on the sentence checks, tool firing 3/4.
 *
 * Revisit with `npm run eval:talk -- --runs=5 --serial --effort=<level>` if the
 * model changes; do not adjust it to chase latency without re-running that.
 */
export const AGENT_EFFORT = 'high' as const;

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}
