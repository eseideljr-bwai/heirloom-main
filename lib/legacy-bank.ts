/**
 * Legacy Bank (contract §6.9): who you can ask about, conversations, asking.
 *
 * A bank is about one person, or about one Family Space. The server decides
 * what each answer may read and sets voice and tense; the client only asks and
 * shows. Answers are the model's words: render them as plain text, never as
 * Markdown or HTML.
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

type Schemas = components['schemas'];

export type LegacyBankSubjects = Schemas['LegacyBankSubjects'];
export type LegacyBankPerson = Schemas['LegacyBankPersonSubject'];
export type LegacyBankSpace = Schemas['LegacyBankSpaceSubject'];
export type LegacyBankConversation = Schemas['LegacyBankConversation'];
export type LegacyBankConversationDetail = Schemas['LegacyBankConversationDetail'];
export type LegacyBankMessage = Schemas['LegacyBankMessage'];
export type LegacyBankScope = Schemas['LegacyBankScope'];
export type LegacyBankVoice = Schemas['LegacyBankVoice'];
export type LegacyBankTense = Schemas['LegacyBankTense'];

/** What a conversation is about: a person, or a Family Space. */
export type LegacyBankTarget =
  | { scope: 'person'; personId: string }
  | { scope: 'space'; spaceId: string };

/** POST /legacy-bank/conversations: every call starts a new conversation. */
export function startConversation(target: LegacyBankTarget): Promise<LegacyBankConversation> {
  return kinloomApi.post('/legacy-bank/conversations', {
    body:
      target.scope === 'person'
        ? { scope: 'person', subject_member_id: target.personId }
        : { scope: 'space', family_space_id: target.spaceId },
  });
}

/** POST …/ask: can take up to a minute (the model has 45 s). Saves both messages. */
export function askQuestion(
  conversationId: string,
  question: string,
): Promise<Schemas['LegacyBankAskResult']> {
  return kinloomApi.post('/legacy-bank/conversations/{conversation}/ask', {
    path: { conversation: conversationId },
    body: { question },
  });
}

/** One page of a conversation's messages, newest first (the API's order). */
export function getConversationPage(
  conversationId: string,
  page: number,
): Promise<LegacyBankConversationDetail> {
  return kinloomApi.get('/legacy-bank/conversations/{conversation}', {
    path: { conversation: conversationId },
    query: { page },
  });
}

// ─── Reading a conversation's subject ──────────────────────────────

export type ConversationSubject = {
  name: string;
  firstName: string;
  /** Person id, when you can still see them. */
  personId: string | null;
  spaceId: string | null;
  isSpace: boolean;
  isYou: boolean;
  tone: string | null;
  initials: string | null;
};

/** Who or what a conversation is about, whether or not you can still see them. */
export function subjectOf(c: LegacyBankConversation): ConversationSubject {
  if (c.space) {
    return {
      name: c.space.name,
      firstName: c.space.name,
      personId: null,
      spaceId: c.space.id,
      isSpace: true,
      isYou: false,
      tone: null,
      initials: null,
    };
  }
  const s = c.subject;
  if (s && 'visible' in s && s.visible === false) {
    return {
      name: s.name,
      firstName: s.name.split(' ')[0] || s.name,
      personId: null,
      spaceId: null,
      isSpace: false,
      isYou: false,
      tone: null,
      initials: null,
    };
  }
  const card = s as Schemas['PersonCard'] | null;
  const name = card?.name ?? 'Someone';
  return {
    name,
    firstName: card?.is_you ? 'you' : name.split(' ')[0] || name,
    personId: card?.id ?? null,
    spaceId: null,
    isSpace: false,
    isYou: !!card?.is_you,
    tone: card?.tone ?? null,
    initials: card?.initials ?? null,
  };
}

/** The title a conversation shows in a list. */
export function conversationTitle(c: LegacyBankConversation): string {
  if (c.title) return c.title;
  const s = subjectOf(c);
  return s.isSpace ? `About ${s.name}` : s.isYou ? 'Reflections on you' : `Reflections on ${s.name}`;
}

/** The label above an answer: "From what Ray kept" or, in the first person, "In Ray's words". */
export function answerLabel(
  s: Pick<ConversationSubject, 'firstName' | 'isSpace' | 'isYou'>,
  voice: LegacyBankVoice,
): string {
  if (s.isSpace) return `From ${s.firstName}`;
  if (voice === 'first_person') return s.isYou ? 'In your words' : `In ${s.firstName}’s words`;
  return s.isYou ? 'From what you kept' : `From what ${s.firstName} kept`;
}

/** Starter questions that need nothing but a name. */
export function starterQuestions(firstName: string, isYou: boolean): string[] {
  const who = isYou ? 'you' : firstName;
  const poss = isYou ? 'your' : `${firstName}’s`;
  return [
    `What’s a story from ${poss} life that shaped ${isYou ? 'you' : 'them'}?`,
    `What life lessons did ${who} most want to pass on?`,
    `What did ${who} want the family to remember?`,
  ];
}
