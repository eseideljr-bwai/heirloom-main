'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ContentBlock, MessageParam, ConverseResponse } from '../../../../lib/agent/types';
import { loadTalkSession, saveTalkSession, clearTalkSession } from '../../../../lib/agent/client-storage';
import { isEmptyContent, sanitizeStoredMessages } from '../../../../lib/agent/content';
import { ShapingCard, type ProposeDraftInput } from './ShapingCard';
import { SplitCard, type SplitIntoMultipleInput } from './SplitCard';

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

function makeOpener(): AssistantTurn {
  return {
    role: 'assistant',
    content: [{ type: 'text', text: 'What’s on your mind?' }] as ContentBlock[],
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
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    // Heal any already-poisoned session: drop empty-content turns (and trim
    // back to a clean resume point) so a corrupted transcript recovers instead
    // of 400ing on every send. No-op for healthy sessions.
    const stored = sanitizeStoredMessages(loadTalkSession());
    if (stored.length > 0) {
      const restored: Turn[] = stored.map(m => {
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
        return { role: 'assistant', content, stop_reason: 'end_turn' };
      });
      setTurns([makeOpener(), ...restored]);
    } else {
      setTurns([makeOpener()]);
    }
    setHydrated(true);
  }, []);

  // Persist real (non-synthetic) turns to sessionStorage after every change.
  useEffect(() => {
    if (!hydrated) return;
    const messages = turnsToMessages(turns);
    if (messages.length === 0) {
      clearTalkSession();
    } else {
      saveTalkSession(messages);
    }
  }, [turns, hydrated]);

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
      clearTalkSession();
      setTurns([makeOpener()]);
      setDraft('');
      setError('Could not open the editor — storage may be full. Your conversation has been cleared.');
      return;
    }
    clearTalkSession();
    router.push(`/create/${type_slug}`);
  };

  type ProposedKinloom = SplitIntoMultipleInput['proposed_kinlooms'][number];
  const handleDevelopFirst = (kinloom: ProposedKinloom, toolUseId: string) => {
    console.log('[kinloom develop first]', kinloom, 'tool_use_id:', toolUseId);
    clearTalkSession();
    setTurns([makeOpener()]);
    setDraft('');
    setError(null);
  };

  const handleStartOver = () => {
    clearTalkSession();
    setTurns([makeOpener()]);
    setDraft('');
    setError(null);
  };

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
  const hasHistory = turns.filter(t => !('synthetic' in t && (t as AssistantTurn).synthetic)).length > 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/create" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 14,
          color: 'var(--fg-3)',
          textDecoration: 'none',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Create
        </Link>

        <span style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-4)',
        }}>
          Talk
        </span>

        {hasHistory && !sending && (
          <button
            onClick={handleStartOver}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: 13,
              color: 'var(--fg-4)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Start fresh
          </button>
        )}
        {!hasHistory && <span style={{ width: 70 }} />}
      </div>

      {/* ── Conversation scroll area ────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '64px 56px 0',
      }}>
        <div style={{ maxWidth: 620 }}>

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
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 14,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'underline',
                }}
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

      {/* ── Input bar ──────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        padding: '18px 56px 24px',
        background: 'var(--background)',
        opacity: isAwaitingCard ? 0.4 : 1,
        pointerEvents: isAwaitingCard ? 'none' : 'auto',
        transition: 'opacity 200ms ease',
      }}>
        <div style={{
          maxWidth: 620,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
        }}>
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
        <p style={{
          maxWidth: 620,
          margin: '10px 0 0',
          fontSize: 12,
          color: 'var(--fg-4)',
        }}>
          Enter to send &middot; Shift+Enter for a new line
        </p>
      </div>

    </div>
  );
}
