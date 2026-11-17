/**
 * Talk conversations kept on this device: the one open in this tab (so a
 * reload doesn't lose it) and the ones the member chose to save, which the
 * "Unfinished conversations" rail lists so they can pick them back up.
 *
 * A conversation is `saved` only when the member presses Save conversation.
 * An unsaved one exists only while it is open: Start fresh clears it, and any
 * left behind (a closed tab) are pruned the next time Talk opens.
 *
 * Storage:
 *   localStorage   `kinloom:talk:conversations:<accountId>`  SavedConversation[]
 *   sessionStorage `kinloom:talk:active`                     id of this tab's open conversation
 *
 * Keyed by account id so two people on one browser never see each other's
 * conversations; cleared on sign-out (see clearAllTalkConversations, called
 * from the auth context). There is no server copy: these are full transcripts,
 * which Talk's server-side memory (notes) deliberately never stores.
 *
 * Every helper swallows storage errors (private mode, quota): losing the rail
 * must never break the conversation itself.
 */

import type { MessageParam } from './types';

export type SavedConversation = {
  id: string;
  /** The member's first message, as the card's title. */
  title: string;
  /** How many messages the member has written. */
  answers: number;
  messages: MessageParam[];
  /** ISO time of the last change to `messages`. */
  updatedAt: string;
  /**
   * True once the member saved it: it shows in the rail and survives Start
   * fresh. Saved conversations keep updating as the member keeps talking.
   * Missing on records from before this flag: those were all rail items.
   */
  saved?: boolean;
};

export const isSaved = (c: SavedConversation): boolean => c.saved !== false;

const LIST_PREFIX = 'kinloom:talk:conversations:';
const ACTIVE_KEY = 'kinloom:talk:active';
/** The pre-rail single-conversation key; migrated once, then removed. */
const LEGACY_SESSION_KEY = 'kinloom:talk:messages';
/** Oldest saved conversations past this are dropped, to stay well inside quota. */
const MAX_CONVERSATIONS = 12;
const TITLE_MAX_CHARS = 120;

const listKey = (accountId: string) => `${LIST_PREFIX}${accountId}`;

export function newConversationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** The member's own words: user turns with plain-string content (not tool results). */
function memberTexts(messages: MessageParam[]): string[] {
  return messages
    .filter(m => m.role === 'user' && typeof m.content === 'string')
    .map(m => (m.content as string).trim())
    .filter(Boolean);
}

function titleFrom(messages: MessageParam[]): string {
  const first = memberTexts(messages)[0] ?? '';
  const oneLine = first.replace(/\s+/g, ' ');
  return oneLine.length > TITLE_MAX_CHARS ? `${oneLine.slice(0, TITLE_MAX_CHARS - 1).trimEnd()}…` : oneLine;
}

/** True when the member has said anything worth keeping. */
export function hasMemberWords(messages: MessageParam[]): boolean {
  return memberTexts(messages).length > 0;
}

export function listConversations(accountId: string): SavedConversation[] {
  if (typeof window === 'undefined' || !accountId) return [];
  try {
    const raw = localStorage.getItem(listKey(accountId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as SavedConversation[])
      .filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

function writeList(accountId: string, list: SavedConversation[]): void {
  try {
    // The cap applies to saved conversations; an open unsaved one never
    // pushes a saved one out.
    const saved = list.filter(isSaved).slice(0, MAX_CONVERSATIONS);
    const open = list.filter(c => !isSaved(c));
    localStorage.setItem(listKey(accountId), JSON.stringify([...saved, ...open]));
  } catch {
    // Quota or private mode: the rail is a convenience, never fatal.
  }
}

/**
 * Store a conversation's current messages, keeping its saved flag (new ones
 * start unsaved). A conversation with none of the member's words is removed
 * instead: there is nothing to pick back up.
 * `updatedAt` moves only when the messages actually changed, so re-saving the
 * same transcript doesn't reorder the rail.
 */
export function saveConversation(accountId: string, id: string, messages: MessageParam[]): void {
  if (typeof window === 'undefined' || !accountId) return;
  const list = listConversations(accountId);
  const existing = list.find(c => c.id === id);
  const rest = list.filter(c => c.id !== id);
  if (!hasMemberWords(messages)) {
    if (existing) writeList(accountId, rest);
    return;
  }
  const unchanged = existing && JSON.stringify(existing.messages) === JSON.stringify(messages);
  const next: SavedConversation = {
    id,
    title: titleFrom(messages),
    answers: memberTexts(messages).length,
    messages,
    updatedAt: unchanged ? existing.updatedAt : new Date().toISOString(),
    saved: existing ? isSaved(existing) : false,
  };
  writeList(accountId, [next, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

/** Save conversation / un-save it (the rail's × on the open conversation). */
export function setConversationSaved(accountId: string, id: string, saved: boolean): void {
  if (typeof window === 'undefined' || !accountId) return;
  writeList(accountId, listConversations(accountId).map(c => (c.id === id ? { ...c, saved } : c)));
}

/** Drop unsaved conversations left behind (closed tabs), except `keepId`. */
export function pruneUnsaved(accountId: string, keepId: string | null): void {
  if (typeof window === 'undefined' || !accountId) return;
  const list = listConversations(accountId);
  const kept = list.filter(c => isSaved(c) || c.id === keepId);
  if (kept.length !== list.length) writeList(accountId, kept);
}

export function removeConversation(accountId: string, id: string): void {
  if (typeof window === 'undefined' || !accountId) return;
  writeList(accountId, listConversations(accountId).filter(c => c.id !== id));
}

export function getActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveConversationId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * One-time move of a conversation kept under the old single-session key into
 * this store (as the open, unsaved conversation), so nobody loses one
 * mid-flight when this ships. Returns the id it
 * was saved under, or null when there was nothing to migrate.
 */
export function migrateLegacySession(accountId: string): string | null {
  if (typeof window === 'undefined' || !accountId) return null;
  try {
    const raw = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !hasMemberWords(parsed as MessageParam[])) return null;
    const id = newConversationId();
    saveConversation(accountId, id, parsed as MessageParam[]);
    return id;
  } catch {
    return null;
  }
}

/** Sign-out: remove every account's saved conversations and this tab's pointer. */
export function clearAllTalkConversations(): void {
  if (typeof window === 'undefined') return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(LIST_PREFIX)) localStorage.removeItem(key);
    }
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // ignore
  }
}
