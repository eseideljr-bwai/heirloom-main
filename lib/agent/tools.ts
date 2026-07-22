/**
 * Tool definitions for the kinloom creation agent.
 *
 * propose_draft and split_into_multiple present a proposal — when the
 * model calls either one, the route handler returns the tool_use block to
 * the client, which renders the right UI (Shaping card for propose_draft,
 * split picker for split_into_multiple). If the user accepts, the client
 * hands off to the publish wizard. If the user declines ("Keep going" /
 * "Keep talking instead"), the client sends a tool_result and the
 * conversation resumes — so these tools are NOT terminal. The system
 * prompt's "When a proposal is declined" section governs that branch.
 *
 * ask_choices (Biographer-only, see BIOGRAPHER_TOOLS) likewise resumes the
 * conversation once the user answers via a tool_result.
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
      "Call this when the conversation contains enough material for a single, atomic kinloom. The user will see a draft they can edit, refine, or save — or decline, choosing to keep talking. This is not a terminal action: if the user declines, you will receive a tool_result asking you to resume the interview, and you must continue with another question rather than ending your turn. Do not call this prematurely — err on the side of one more good question. Do not call this if the material spans multiple distinct kinlooms; use split_into_multiple instead. The body should be in the user's voice using their actual words; do not embellish or invent details they didn't share.",
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
      "Call this when the material contains multiple distinct kinlooms — propose them as a reviewable batch with a working title, one-line summary, and type for each. The Talk agent uses this for exactly 2 items; the Biographer uses it for larger batches. This is not a terminal action: the user may decline the split and choose to keep talking, in which case you will receive a tool_result asking you to resume the interview and must continue with another question. Do not use this to avoid landing a single kinloom — only when the material genuinely contains separate atomic units.",
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
                description: 'A single sentence describing what this kinloom would capture. Used for the review list only — this is NOT the kinloom body.',
              },
              body: {
                type: 'string',
                description:
                  "The full kinloom content for this item, drawn from the source document in the person's own words. Stay as close as possible to the original language — extract and lightly tidy the relevant passage, never summarize, condense, or invent. This is what gets saved as the kinloom, so it must be the complete text, not a summary.",
              },
              suggested_type_slug: {
                type: 'string',
                enum: KINLOOM_TYPE_SLUGS,
                description: 'The kinloom type this one would likely be.',
              },
            },
            required: ['working_title', 'one_line_summary', 'body', 'suggested_type_slug'],
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

/**
 * ask_choices — a mid-conversation elicitation tool. Presents one or more
 * questions, each with a short set of options rendered as buttons. Unlike
 * the terminal tools above, calling this does not hand off to the publish
 * wizard; the conversation pauses for the user's selection and resumes.
 */
export const ASK_CHOICES_TOOL: Anthropic.Messages.Tool = {
  name: 'ask_choices',
  description:
    'Present the user with one or more questions, each offering a short set of selectable options rendered as buttons. Use this whenever you want the user to choose between distinct paths or answer a structured question, instead of asking in prose.',
  input_schema: {
    type: 'object',
    properties: {
      questions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'The question shown above the buttons.',
            },
            options: {
              type: 'array',
              minItems: 2,
              maxItems: 4,
              items: { type: 'string' },
              description: '2–4 short labels, each rendered as a button.',
            },
          },
          required: ['question', 'options'],
        },
      },
    },
    required: ['questions'],
  },
};

/**
 * Tools available to the Biographer (Import) agent. Adds the mid-conversation
 * ask_choices elicitation tool on top of the shared terminal tools.
 */
export const BIOGRAPHER_TOOLS: Anthropic.Messages.Tool[] = [...CONVERSE_TOOLS, ASK_CHOICES_TOOL];
