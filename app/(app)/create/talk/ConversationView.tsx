'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentBlock, MessageParam, ConverseResponse } from '../../../../lib/agent/types';
import {
  type SavedConversation,
  getActiveConversationId,
  hasMemberWords,
  isSaved,
  listConversations,
  migrateLegacySession,
  newConversationId,
  pruneUnsaved,
  removeConversation,
  saveConversation,
  setActiveConversationId,
  setConversationSaved,
} from '../../../../lib/agent/conversation-store';
import { isEmptyContent, sanitizeStoredMessages } from '../../../../lib/agent/content';
import { reportUnauthorized } from '../../../../lib/embed';
import { useAuth } from '../../../../lib/auth-context';
import NativeExitLink from '../../../components/NativeExitLink';
import { ShapingCard, type ProposeDraftInput } from './ShapingCard';
import { SplitCard, type SplitIntoMultipleInput } from './SplitCard';
import UnfinishedConversations from './UnfinishedConversations';

// ─── Turn types ───────────────────────────────────────────────────────────────

type TextUserTurn = { role: 'user'; content: string };
type ToolResultUserTurn = {
  role: 'user';
  content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }>;
  _tool_result: true;
};
type UserTurn = TextUserTurn | ToolResultUserTurn;

// synthetic: true marks the opening greeting — rendered but never sent to the API.
type AssistantTurn = { role: 'assistant'; content: ContentBlock[]; stop_reason: string; synthetic?: boolean };

type Turn = UserTurn | AssistantTurn;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * The name the opener greets the member by: the name they chose to be called
 * (`display_name`, used whole: it may be "Grandpa Joe"), else the first word
 * of their full name. Empty when neither is known.
 */
function greetingName(user: { display_name?: string | null; name?: string | null } | null): string {
  const display = user?.display_name?.trim();
  if (display) return display;
  return user?.name?.trim().split(/\s+/)[0] ?? '';
}

function makeOpener(firstName: string): AssistantTurn {
  const text = firstName
    ? `Welcome, ${firstName}. What would you like to share today?`
    : 'Welcome. What would you like to share today?';
  return {
    role: 'assistant',
    content: [{ type: 'text', text }] as ContentBlock[],
    stop_reason: 'end_turn',
    synthetic: true,
  };
}

function turnsToMessages(turns: Turn[]): MessageParam[] {
  return turns
    .filter(t => !(t.role === 'assistant' && (t as AssistantTurn).synthetic))
    .map(t => {
      if (t.role === 'assistant') {
        return { role: 'assistant' as const, content: t.content as MessageParam['content'] };
      }
      if ('_tool_result' in t) {
        return { role: 'user' as const, content: t.content as MessageParam['content'] };
      }
      return { role: 'user' as const, content: t.content };
    });
}

/**
 * Rebuild display turns from a stored transcript (healed first: see
 * sanitizeStoredMessages). A transcript that ends on a proposal (an assistant
 * tool_use the member never answered) comes back with stop_reason 'tool_use',
 * so its card shows again and the composer stays blocked until they choose:
 * restoring it as a plain turn would leave an unpaired tool_use that 400s on
 * the next send.
 */
function messagesToTurns(stored: MessageParam[]): Turn[] {
  const messages = sanitizeStoredMessages(stored);
  return messages.map((m, i) => {
    if (m.role === 'user') {
      if (Array.isArray(m.content)) {
        return {
          role: 'user',
          content: m.content as ToolResultUserTurn['content'],
          _tool_result: true,
        } as ToolResultUserTurn;
      }
      return { role: 'user', content: typeof m.content === 'string' ? m.content : '' } as TextUserTurn;
    }
    const content = (
      Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }]
    ) as ContentBlock[];
    const endsOnProposal = i === messages.length - 1 && getToolUse(content) !== null;
    return { role: 'assistant', content, stop_reason: endsOnProposal ? 'tool_use' : 'end_turn' };
  });
}

function getTextParagraphs(content: ContentBlock[]): string[] {
  const paragraphs: string[] = [];
  for (const block of content) {
    if (block.type !== 'text') continue;
    const text = typeof block.text === 'string' ? block.text : '';
    for (const raw of text.split(/\n\n+/)) {
      const para = raw.trim();
      if (para) paragraphs.push(para);
    }
  }
  return paragraphs;
}

// Extract the first tool_use block from an assistant turn, if present.
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
function getToolUse(content: ContentBlock[]): ToolUseBlock | null {
  for (const block of content) {
    if (block.type === 'tool_use') return block as unknown as ToolUseBlock;
  }
  return null;
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

function AgentProse({ content }: { content: ContentBlock[] }) {
  const paragraphs = getTextParagraphs(content);
  if (paragraphs.length === 0) return null;
  return (
    <div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 19,
          lineHeight: 1.82,
          color: 'var(--fg-1)',
          margin: i < paragraphs.length - 1 ? '0 0 20px' : 0,
        }}>
          {para}
        </p>
      ))}
    </div>
  );
}

function UserQuote({ content }: { content: string }) {
  return (
    <div style={{
      borderLeft: '3px solid rgba(85, 107, 91, 0.28)',
      paddingLeft: 22,
    }}>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: 1.75,
        fontStyle: 'italic',
        color: 'var(--fg-2)',
        margin: 0,
        whiteSpace: 'pre-wrap',
      }}>
        {content}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConversationView() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = greetingName(user);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // The conversation open in this tab, and the member's saved ones (the rail).
  const accountId = user?.id ?? '';
  const [activeId, setActiveId] = useState('');
  const [saved, setSaved] = useState<SavedConversation[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Hydrate on mount (and again if the signed-in account changes): reopen this
  // tab's conversation if it is still saved, else start a new one.
  useEffect(() => {
    const migratedId = migrateLegacySession(accountId);
    const list = listConversations(accountId);
    const wanted = getActiveConversationId() ?? migratedId;
    // Unsaved conversations live only while open: drop any a closed tab left.
    pruneUnsaved(accountId, wanted);
    const current = wanted ? list.find(c => c.id === wanted) : undefined;
    if (current) {
      setActiveId(current.id);
      setTurns([makeOpener(firstName), ...messagesToTurns(current.messages)]);
    } else {
      const id = newConversationId();
      setActiveConversationId(id);
      setActiveId(id);
      setTurns([makeOpener(firstName)]);
    }
    setSaved(listConversations(accountId));
    setHydrated(true);
    // firstName is read once here; the effect below keeps it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // Keep the greeting's name current if the user object changes after mount
  // (e.g. it arrives late or the member renames themselves). Only the
  // synthetic opener is touched; it is never sent to the API.
  useEffect(() => {
    setTurns(prev =>
      prev.map(t => (t.role === 'assistant' && (t as AssistantTurn).synthetic ? makeOpener(firstName) : t)),
    );
  }, [firstName]);

  // Store the open conversation after every change, so a reload never loses
  // it. It shows in the rail only once saved (Save conversation); after that
  // the saved copy keeps updating as the member keeps talking.
  useEffect(() => {
    if (!hydrated || !activeId) return;
    saveConversation(accountId, activeId, turnsToMessages(turns));
    setSaved(listConversations(accountId));
  }, [turns, hydrated, activeId, accountId]);

  /**
   * Open a brand-new, empty conversation. The one being left is cleared unless
   * it was saved, in which case it stays in the rail.
   */
  const startNewConversation = () => {
    const leaving = saved.find(c => c.id === activeId);
    if (leaving && !isSaved(leaving)) removeConversation(accountId, activeId);
    const id = newConversationId();
    setActiveConversationId(id);
    setActiveId(id);
    setTurns([makeOpener(firstName)]);
    setDraft('');
    setError(null);
  };

  /** Reopen a saved conversation from the rail (after confirmLeave). */
  const openConversation = (id: string) => {
    const conversation = saved.find(c => c.id === id);
    if (!conversation) return;
    const leaving = saved.find(c => c.id === activeId);
    if (leaving && !isSaved(leaving)) removeConversation(accountId, activeId);
    setActiveConversationId(id);
    setActiveId(id);
    setTurns([makeOpener(firstName), ...messagesToTurns(conversation.messages)]);
    setDraft('');
    setError(null);
  };

  /**
   * The rail's ×. For the open conversation it only un-saves it (it stays on
   * screen, and Start fresh will then clear it); any other is deleted.
   */
  const handleDiscardConversation = (id: string) => {
    if (sending) return;
    if (id === activeId) setConversationSaved(accountId, id, false);
    else removeConversation(accountId, id);
    setSaved(listConversations(accountId));
  };

  /** Save conversation: the open conversation joins the rail. */
  const handleSaveConversation = () => {
    if (sending || !activeId) return;
    // The effect above has already stored it; mark it saved.
    saveConversation(accountId, activeId, turnsToMessages(turns));
    setConversationSaved(accountId, activeId, true);
    setSaved(listConversations(accountId));
  };

  // ── Leaving the open conversation (Start fresh, or opening another) ────────
  // When it holds the member's words, confirm first: unsaved, it is cleared;
  // saved, it waits in the rail.
  type LeaveAction = { kind: 'fresh' } | { kind: 'open'; id: string };
  const [pendingLeave, setPendingLeave] = useState<LeaveAction | null>(null);

  const leaveNow = (action: LeaveAction) => {
    setPendingLeave(null);
    if (action.kind === 'fresh') startNewConversation();
    else openConversation(action.id);
  };

  const confirmLeave = (action: LeaveAction) => {
    if (sending) return;
    if (action.kind === 'open' && action.id === activeId) return;
    if (!hasMemberWords(turnsToMessages(turns))) {
      leaveNow(action);
      return;
    }
    setPendingLeave(action);
  };

  const handleOpenConversation = (id: string) => confirmLeave({ kind: 'open', id });

  // Scroll to bottom after new content appears.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Auto-grow textarea up to ~6 rows.
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 156)}px`;
  }, []);

  // Fire the API and append the assistant's reply. Returns true if an
  // assistant turn was appended.
  //
  // Two guards keep the transcript from poisoning itself: the model
  // occasionally returns an empty turn (content []), which renders as nothing,
  // persists, and then 400s on every subsequent send. So we (1) retry the
  // identical request once on an empty response, and (2) never append empty
  // content — if both attempts come back empty we surface a clean error and
  // leave the transcript untouched.
  const fireApiCall = async (nextTurns: Turn[]): Promise<boolean> => {
    setSending(true);
    setError(null);
    const outgoing = turnsToMessages(nextTurns);
    try {
      let message: ContentBlock[] | null = null;
      let stopReason = 'end_turn';
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch('/api/agent/converse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: outgoing }),
        });
        if (!res.ok) {
          reportUnauthorized(res.status);
          const data = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(data.error ?? `Request failed (${res.status})`);
        }
        const data = await res.json() as ConverseResponse;
        if (!isEmptyContent(data.message)) {
          message = data.message;
          stopReason = data.stop_reason;
          break;
        }
        // Empty response — loop to retry the identical request exactly once.
      }
      if (message === null) {
        setError('The agent didn’t respond. Please try again.');
        return false;
      }
      const finalMessage = message;
      setTurns(prev => [...prev, {
        role: 'assistant',
        content: finalMessage,
        stop_reason: stopReason,
      }]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userTurn: TextUserTurn = { role: 'user', content: text };
    const nextTurns: Turn[] = [...turns, userTurn];
    setTurns(nextTurns);
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await fireApiCall(nextTurns);
  };

  const handleRetry = () => {
    if (sending) return;
    const last = turns[turns.length - 1];
    if (last?.role === 'user' && !('_tool_result' in last)) {
      setDraft((last as TextUserTurn).content);
      setTurns(prev => prev.slice(0, -1));
    }
    setError(null);
  };

  const handleKeepGoing = async (toolUseId: string) => {
    const toolResultTurn: ToolResultUserTurn = {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: 'The user declined that draft and wants to keep going. The interview is active again. Do not propose another draft yet. Ask exactly one more concrete question that draws out more of their story — pick up from what they last shared and go deeper on the moment, its weight, or a specific detail. Respond now with that single question; do not end your turn empty and do not hand off.',
      }],
      _tool_result: true,
    };
    const prevTurns = turns;
    const nextTurns: Turn[] = [...turns, toolResultTurn];
    setTurns(nextTurns);
    const ok = await fireApiCall(nextTurns);
    // If the agent never answered, drop the pending tool_result so the card
    // reappears and the transcript stays clean (no unpaired tool_result).
    if (!ok) setTurns(prevTurns);
  };

  const handleKeepTalking = async (toolUseId: string) => {
    const toolResultTurn: ToolResultUserTurn = {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: 'The user does not want to split this into multiple kinlooms and wants to keep talking. The interview is active again. Do not call a tool yet. Ask exactly one more concrete question that continues the thread from what they last shared. Respond now with that single question; do not end your turn empty and do not hand off.',
      }],
      _tool_result: true,
    };
    const prevTurns = turns;
    const nextTurns: Turn[] = [...turns, toolResultTurn];
    setTurns(nextTurns);
    const ok = await fireApiCall(nextTurns);
    // If the agent never answered, drop the pending tool_result so the card
    // reappears and the transcript stays clean (no unpaired tool_result).
    if (!ok) setTurns(prevTurns);
  };

  const handlePublish = (input: ProposeDraftInput) => {
    const { title, type_slug, body } = input;
    try {
      sessionStorage.setItem('kinloom:draft-handoff', JSON.stringify({ title, type_slug, body }));
    } catch {
      // The conversation stays saved in the rail, so nothing is lost.
      setError('Could not open the editor. Storage may be full; please try again.');
      return;
    }
    // Shaped into a kinloom: it no longer waits in the rail, saved or not. Point this tab at
    // a fresh conversation for when the member comes back to Talk.
    removeConversation(accountId, activeId);
    setActiveConversationId(newConversationId());
    router.push(`/create/${type_slug}`);
  };

  type ProposedKinloom = SplitIntoMultipleInput['proposed_kinlooms'][number];
  const handleDevelopFirst = (kinloom: ProposedKinloom, toolUseId: string) => {
    console.log('[kinloom develop first]', kinloom, 'tool_use_id:', toolUseId);
    startNewConversation();
  };

  /** Start fresh (and the Shaping card's start over): confirm, then clear. */
  const handleStartOver = () => confirmLeave({ kind: 'fresh' });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!hydrated) return null;

  // Determine whether the last assistant turn is awaiting a card response.
  const lastTurn = turns[turns.length - 1];
  const pendingToolUse = (
    lastTurn?.role === 'assistant' && lastTurn.stop_reason === 'tool_use'
      ? getToolUse(lastTurn.content)
      : null
  );
  const isAwaitingCard = pendingToolUse !== null;
  const canSend = draft.trim().length > 0 && !sending && !isAwaitingCard;
  const hasWords = hasMemberWords(turnsToMessages(turns));
  const openSaved = saved.find(c => c.id === activeId);
  const isOpenSaved = !!openSaved && isSaved(openSaved);
  const railItems = saved.filter(isSaved);

  return (
    <div className="chat-flow">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="chat-flow__head">
        <NativeExitLink href="/create" message={{ type: 'cancel' }} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: 'var(--fg-3)',
          textDecoration: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Create
        </NativeExitLink>

        <span style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-4)',
        }}>
          Talk
        </span>

        <span style={{ width: 70 }} aria-hidden="true" />
      </div>

      {/* ── Thread + unfinished-conversations rail ─────────────────────── */}
      <div className="chat-flow__body">
      <UnfinishedConversations
        conversations={railItems}
        activeId={activeId}
        disabled={sending}
        onOpen={handleOpenConversation}
        onDiscard={handleDiscardConversation}
      />

      {/* ── Conversation scroll area ────────────────────────────────── */}
      <div className="chat-flow__thread">
        <div className="chat-flow__thread-inner">

          {turns.map((turn, i) => {
            // For the last assistant turn with a tool_use, render prose then the card.
            if (turn.role === 'assistant') {
              const isLast = i === turns.length - 1;
              const toolUse = isLast && turn.stop_reason === 'tool_use'
                ? getToolUse(turn.content)
                : null;

              return (
                <div key={i} style={{ marginBottom: toolUse ? 0 : 48 }}>
                  <AgentProse content={turn.content} />
                  {toolUse && toolUse.name === 'propose_draft' && (
                    <div style={{ marginTop: 32 }}>
                      <ShapingCard
                        toolUseId={toolUse.id}
                        input={toolUse.input as ProposeDraftInput}
                        onPublish={handlePublish}
                        onKeepGoing={handleKeepGoing}
                        onStartOver={handleStartOver}
                      />
                    </div>
                  )}
                  {toolUse && toolUse.name === 'split_into_multiple' && (
                    <div style={{ marginTop: 32 }}>
                      <SplitCard
                        toolUseId={toolUse.id}
                        input={toolUse.input as SplitIntoMultipleInput}
                        onDevelopFirst={handleDevelopFirst}
                        onKeepTalking={handleKeepTalking}
                      />
                    </div>
                  )}
                </div>
              );
            }

            // User turns: only render text turns visually (tool_result turns are invisible).
            if ('_tool_result' in turn) return null;
            return (
              <div key={i} style={{ marginBottom: 48 }}>
                <UserQuote content={(turn as TextUserTurn).content} />
              </div>
            );
          })}

          {/* Inline error with retry */}
          {error && (
            <div style={{ marginBottom: 40 }}>
              <p style={{
                fontSize: 14,
                color: 'var(--destructive)',
                margin: '0 0 8px',
                lineHeight: 1.5,
              }}>
                {error}
              </p>
              <button
                onClick={handleRetry}
                className="text-btn text-btn--retry"
              >
                Try again
              </button>
            </div>
          )}

          {/* Sending indicator — animated dots while the agent works on the
              response. Reuses the app-wide `kinloom-bounce` loader keyframe
              (see globals.css); mirrors the Biographer view. */}
          {sending && (
            <div style={{ marginBottom: 40 }}>
              <div
                role="status"
                aria-label="The agent is thinking"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: 'rgba(85, 107, 91, 0.5)',
                      animation: 'kinloom-bounce 1.2s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} style={{ height: 40 }} />
        </div>
      </div>
      </div>

      {/* ── Input bar ──────────────────────────────────────────────── */}
      <div className={`chat-flow__composer${isAwaitingCard ? ' is-blocked' : ''}`}>
        <div className="chat-flow__composer-row">
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            disabled={sending || isAwaitingCard}
            placeholder="Reply…"
            onChange={e => { setDraft(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.background = 'var(--card)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'transparent';
              e.currentTarget.style.background = 'var(--input-background)';
            }}
            style={{
              flex: 1,
              resize: 'none',
              overflow: 'hidden',
              padding: '12px 16px',
              background: 'var(--input-background)',
              border: '1px solid transparent',
              borderRadius: 8,
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              lineHeight: 1.6,
              color: 'var(--foreground)',
              outline: 'none',
              minHeight: 48,
              transition: 'border-color 150ms ease, background 150ms ease',
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!canSend}
            style={{
              flexShrink: 0,
              alignSelf: 'flex-end',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
              border: 'none',
              borderRadius: 8,
              padding: '12px 22px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: canSend ? 'pointer' : 'not-allowed',
              opacity: canSend ? 1 : 0.5,
              minHeight: 48,
              transition: 'opacity 150ms ease',
            }}
          >
            Send
          </button>
        </div>
        <p className="chat-flow__hint">
          Enter to send &middot; Shift+Enter for a new line
        </p>

        {/* Not dimmed by is-blocked: saving or starting over stays possible
            while a Shaping or Split card waits for an answer. */}
        <div className="chat-flow__actions">
          <button
            type="button"
            className="btn-outline btn-outline--sm"
            onClick={handleSaveConversation}
            disabled={sending || !hasWords || isOpenSaved}
            title={isOpenSaved ? 'Saved. It keeps updating as you talk.' : undefined}
          >
            {isOpenSaved ? 'Saved' : 'Save conversation'}
          </button>
          <button
            type="button"
            className="btn-outline btn-outline--sm"
            onClick={handleStartOver}
            disabled={sending}
          >
            Start fresh
          </button>
        </div>
      </div>

      {pendingLeave && (
        <div
          className="modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setPendingLeave(null); }}
          onKeyDown={e => { if (e.key === 'Escape') setPendingLeave(null); }}
        >
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="talk-leave-title" aria-describedby="talk-leave-text">
            {isOpenSaved ? (
              <>
                <h3 id="talk-leave-title" className="modal-title">
                  {pendingLeave.kind === 'fresh' ? 'Start fresh?' : 'Switch conversations?'}
                </h3>
                <p id="talk-leave-text" className="modal-text">
                  This conversation is saved. It will wait under Unfinished conversations, so you can pick it back up.
                </p>
              </>
            ) : (
              <>
                <h3 id="talk-leave-title" className="modal-title">Clear this conversation?</h3>
                <p id="talk-leave-text" className="modal-text">
                  {pendingLeave.kind === 'fresh' ? 'Starting fresh' : 'Opening another conversation'} will clear
                  this one. It hasn&rsquo;t been saved, so it can&rsquo;t be brought back. To keep it, choose Save
                  conversation first.
                </p>
              </>
            )}
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setPendingLeave(null)} autoFocus>
                Keep talking
              </button>
              <button
                type="button"
                className={isOpenSaved ? 'btn-primary' : 'btn-danger-solid'}
                onClick={() => leaveNow(pendingLeave)}
              >
                {isOpenSaved
                  ? (pendingLeave.kind === 'fresh' ? 'Start fresh' : 'Open it')
                  : (pendingLeave.kind === 'fresh' ? 'Clear and start fresh' : 'Clear and open')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
