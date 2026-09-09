/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TEMPORARY. THIS ENTIRE FILE IS A STAND-IN AND WILL BE DELETED.
 *
 *  There is no agent behind the feedback tool yet — no model call, no tool
 *  schema, nothing. This file fakes one with a fixed decision tree so the
 *  conversation UI can be built and reviewed against something real.
 *
 *  Every scripted string lives here. No component hardcodes a response, so
 *  replacing this module with a real agent touches nothing else.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { FeedbackConversation } from './conversation-storage';
import type {
  FeedbackArea,
  FeedbackCategory,
  FeedbackMessage,
  FeedbackSeverity,
} from './types';

export type ScriptBranch =
  | 'bug'
  | 'usability'
  | 'feature_request'
  | 'praise'
  | 'unclassified';

/**
 * THE TWO-QUESTION CEILING IS A PRODUCT DECISION, NOT AN OVERSIGHT.
 *
 * The agent asks at most two clarifying questions, and on some paths zero.
 * The uneven counts below are deliberate — a bug needs the expectation as
 * well as the symptom; praise needs nothing at all. Do not add a third
 * question to any branch.
 */
const SCRIPT: Record<ScriptBranch, readonly string[]> = {
  bug: ['What happened?', 'What did you expect to see instead?'],
  usability: ['What were you trying to do?'],
  feature_request: ['What problem would that solve for you?'],
  praise: [],
  unclassified: ['What happened?'],
};

/** Enforced at module load — a third question can't slip in unnoticed. */
for (const [branch, questions] of Object.entries(SCRIPT)) {
  if (questions.length > 2) {
    throw new Error(
      `[feedback] scripted branch "${branch}" asks ${questions.length} questions; the ceiling is two.`,
    );
  }
}

export function branchForCategory(
  category: FeedbackCategory | null,
): ScriptBranch {
  switch (category) {
    case 'bug':
      return 'bug';
    case 'usability':
      return 'usability';
    case 'feature_request':
      return 'feature_request';
    case 'praise':
      return 'praise';
    default:
      // No chip — the user just started typing.
      return 'unclassified';
  }
}

function appendMessage(
  messages: FeedbackMessage[],
  role: FeedbackMessage['role'],
  content: string,
): FeedbackMessage[] {
  // `sequence` is dense and 0-based, assigned at append time. It is the
  // authoritative order, so it must never be derived from a filtered view.
  return [...messages, { role, content, sequence: messages.length }];
}

/**
 * Advance the conversation by one turn.
 *
 * `userText` is the user's message, or null when the conversation is opening
 * on a chip alone. Either the next scripted question is appended, or the
 * conversation is marked complete — which is the point at which the
 * confirmation card appears.
 *
 * Pure. No timers, no I/O, no randomness.
 */
export function advance(
  conversation: FeedbackConversation,
  userText: string | null,
): FeedbackConversation {
  if (conversation.phase === 'complete') return conversation;

  const trimmed = userText?.trim();
  const messages = trimmed
    ? appendMessage(conversation.messages, 'user', trimmed)
    : conversation.messages;

  const question = SCRIPT[conversation.branch][conversation.asked];
  if (question === undefined) {
    return { ...conversation, messages, phase: 'complete' };
  }

  return {
    ...conversation,
    messages: appendMessage(messages, 'assistant', question),
    asked: conversation.asked + 1,
  };
}

// ─── Scripted card prefills ─────────────────────────────────────────────────

/**
 * What the agent would have proposed once it had enough to summarise.
 *
 * These are FIXED PER BRANCH and take no account of what the user actually
 * typed — a scripted stand-in cannot read the conversation. A real agent
 * would write these from the transcript and would derive `area` from where
 * the user was, rather than always claiming Import for a bug.
 *
 * The register is deliberate: third person, declarative, three short
 * sentences, no adjectives, no apology. It is a report, not a reply.
 *
 * Every one of these values is editable in the card. That matters more than
 * the values themselves — a wrong prefill the user corrects is fine, a wrong
 * prefill they can't see how to correct is the failure mode.
 */
export type ScriptedProposal = {
  title: string;
  summary: string;
  category: FeedbackCategory;
  area: FeedbackArea;
  severity: FeedbackSeverity;
};

const PROPOSALS: Record<ScriptBranch, ScriptedProposal> = {
  bug: {
    title: 'Import created one kinloom from a multi-story document',
    summary:
      'The user imported a letter containing several distinct stories. Only one kinloom was created. They expected the document to be split into separate kinlooms.',
    category: 'bug',
    area: 'creation_import',
    severity: 'major',
  },
  usability: {
    title: 'No clear way to find one person in the family tree',
    summary:
      'The user opened the family tree looking for a specific relative. The view gave them no way to search or jump to a name. They expected to reach a person without reading the whole tree.',
    category: 'usability',
    area: 'family_space',
    severity: 'minor',
  },
  feature_request: {
    title: 'Kinlooms can only be exported one at a time',
    summary:
      'The user wanted to keep a copy of several kinlooms outside Kinloom. Each one had to be exported on its own. They expected to select a group and export it in a single step.',
    category: 'feature_request',
    area: 'library',
    severity: 'minor',
  },
  praise: {
    title: 'Talk track drew out more than the user expected to say',
    summary:
      'The user created a kinloom through the Talk track. The questions moved the conversation along without repeating themselves. They said the result was closer to what they meant than what they would have written alone.',
    category: 'praise',
    area: 'creation_talk',
    severity: 'cosmetic',
  },
  unclassified: {
    title: 'Page did not respond after publishing',
    summary:
      'The user published a kinloom and the page stayed as it was. They could not tell whether the kinloom had saved. They expected either a confirmation or a return to the library.',
    category: 'other',
    area: 'other',
    severity: 'minor',
  },
};

export function proposalForBranch(branch: ScriptBranch): ScriptedProposal {
  return PROPOSALS[branch];
}

/** A fresh conversation, already advanced through its opening turn. */
export function startConversation(
  category: FeedbackCategory | null,
  openingText: string,
): FeedbackConversation {
  return advance(
    {
      branch: branchForCategory(category),
      asked: 0,
      phase: 'asking',
      messages: [],
    },
    openingText,
  );
}
