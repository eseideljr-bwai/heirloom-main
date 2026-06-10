import Anthropic from '@anthropic-ai/sdk';

export const AGENT_MODEL = 'claude-opus-4-7';
export const AGENT_MAX_TOKENS = 1024;

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}
