import type { ContentBlock, MessageParam as SDKMessageParam } from '@anthropic-ai/sdk/resources/messages';

/** Re-export the SDK type so callers don't need to import from the SDK directly. */
export type { ContentBlock };
export type MessageParam = SDKMessageParam;

export type ConverseRequest = {
  messages: MessageParam[];
};

export type ConverseResponse = {
  message: ContentBlock[];
  stop_reason: string;
};

/** Maximum user turns before the route rejects further input. */
export const MAX_TURNS = 30;
