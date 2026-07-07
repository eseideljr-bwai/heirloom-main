/**
 * Tool definitions for the kinloom creation agent.
 *
 * Both tools are terminal — when the model calls either one, the route
 * handler should return the tool_use block to the client and stop the
 * conversation loop. The client dispatches on the tool name to render
 * the right UI (Shaping card for propose_draft, split picker for
 * split_into_multiple).
 */

import type Anthropic from '@anthropic-ai/sdk';

/** Canonical kinloom type slugs supported by the backend. */
export const KINLOOM_TYPE_SLUGS = [
  'story',
  'lesson',
  'belief',
  'message',
  'tradition',
  'milestone',
  'reflection',
  'photo-collection',
] as const;

export const CONVERSE_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'propose_draft',
    description:
      "Call this when the conversation contains enough material for a single, atomic kinloom. The user will see a draft they can edit, refine, or save. Do not call this prematurely — err on the side of one more good question. Do not call this if the material spans multiple distinct kinlooms; use split_into_multiple instead. The body should be in the user's voice using their actual words; do not embellish or invent details they didn't share.",
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description:
            "A short, evocative title in the user's voice. Not a label — a real title. Avoid generic titles like 'My Story' or 'A Lesson.'",
        },
        type_slug: {
          type: 'string',
          enum: KINLOOM_TYPE_SLUGS,
          description: 'The kinloom type inferred from the content.',
        },
        body: {
          type: 'string',
          description:
            "The kinloom content, drawn from the user's words. Lightly shaped for readability (paragraph breaks where natural), never embellished. If the user spoke it, preserve their phrasing.",
        },
        confidence_notes: {
          type: 'string',
          description:
            'A brief internal note (not shown to user) on why you chose this type and what feels strongest about this kinloom. Helps with later evaluation.',
        },
      },
      required: ['title', 'type_slug', 'body'],
    },
  },
  {
    name: 'split_into_multiple',
    description:
      "Call this when the material contains multiple distinct kinlooms — propose them as a reviewable batch with a working title, one-line summary, and type for each. The Talk agent uses this for exactly 2 items; the Biographer uses it for larger batches. Do not use this to avoid landing a single kinloom — only when the material genuinely contains separate atomic units.",
    input_schema: {
      type: 'object',
      properties: {
        proposed_kinlooms: {
          type: 'array',
          minItems: 2,
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              working_title: {
                type: 'string',
                description: 'A short title for this proposed kinloom.',
              },
              one_line_summary: {
                type: 'string',
                description: 'A single sentence describing what this kinloom would capture.',
              },
              suggested_type_slug: {
                type: 'string',
                enum: KINLOOM_TYPE_SLUGS,
                description: 'The kinloom type this one would likely be.',
              },
            },
            required: ['working_title', 'one_line_summary', 'suggested_type_slug'],
          },
        },
        reasoning: {
          type: 'string',
          description:
            'A brief note on why these are distinct kinlooms rather than one — internal only, not shown to the user.',
        },
      },
      required: ['proposed_kinlooms'],
    },
  },
];
