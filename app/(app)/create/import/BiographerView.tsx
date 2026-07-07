'use client';

/**
 * BiographerView — conversation UI for the Import track.
 *
 * Differences from ConversationView (Talk track):
 *   - No synthetic opener. The Biographer's first response IS the opening
 *     turn — it reads the document and replies on its own.
 *   - On mount with no stored session, auto-fires the first API call
 *     (just the document, no user message).
 *   - Document text comes from sessionStorage (saved by the import page).
 *   - API endpoint is /api/agent/biographer, which prepends the document
 *     with cache_control and uses claude-sonnet-4-6.
 *   - split_into_multiple renders BiographerBatchCard (N items).
 *   - Start Over goes back to the file picker (calls onStartOver prop).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentBlock, MessageParam, ConverseResponse } from '../../../../lib/agent/types';
import {
  loadImportDocument,
  loadImportMessages,
  saveImportMessages,
  clearImportSession,
} from '../../../../lib/biographer/client-storage';
import { ShapingCard, type ProposeDraftInput } from '../talk/ShapingCard';
import { BiographerBatchCard, type BatchInput } from './BiographerBatchCard';

// ─── Turn types ───────────────────────────────────────────────────────────────

type TextUserTurn = { role: 'user'; content: string };
type ToolResultUserTurn = {
  role: 'user';
  content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }>;
  _tool_result: true;
};
type UserTurn = TextUserTurn | ToolResultUserTurn;
type AssistantTurn = { role: 'assistant'; content: ContentBlock[]; stop_reason: string };
type Turn = UserTurn | AssistantTurn;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function turnsToMessages(turns: Turn[]): MessageParam[] {
  return turns.map(t => {
    if (t.role === 'assistant') {
      return { role: 'assistant' as const, content: t.content as MessageParam['content'] };
    }
    if ('_tool_result' in t) {
      return { role: 'user' as const, content: t.content as MessageParam['content'] };
    }
    return { role: 'user' as const, content: (t as TextUserTurn).content };
  });
}

function messagesToTurns(messages: MessageParam[]): Turn[] {
  return messages.map(m => {
    if (m.role === 'assistant') {
      const content = (
        Array.isArray(m.content)
          ? m.content
          : [{ type: 'text', text: String(m.content) }]
      ) as ContentBlock[];
      return { role: 'assistant', content, stop_reason: 'end_turn' } as AssistantTurn;
    }
    if (Array.isArray(m.content)) {
      return {
        role: 'user',
        content: m.content as ToolResultUserTurn['content'],
        _tool_result: true,
      } as ToolResultUserTurn;
    }
    return { role: 'user', content: typeof m.content === 'string' ? m.content : '' } as TextUserTurn;
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

type ToolUseBlock = {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
};

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
        <p
          key={i}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 19,
            lineHeight: 1.82,
            color: 'var(--fg-1)',
            margin: i < paragraphs.length - 1 ? '0 0 20px' : 0,
          }}
        >
          {para}
        </p>
      ))}
    </div>
  );
}

function UserQuote({ content }: { content: string }) {
  return (
    <div style={{ borderLeft: '3px solid rgba(85, 107, 91, 0.28)', paddingLeft: 22 }}>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 17,
          lineHeight: 1.75,
          fontStyle: 'italic',
          color: 'var(--fg-2)',
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { onStartOver: () => void };

export default function BiographerView({ onStartOver }: Props) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<string | null>(null);

  // ── Boot: load document + restore or start session ─────────────────

  useEffect(() => {
    const doc = loadImportDocument();
    if (!doc) {
      // Document was lost (e.g. storage cleared) — go back to pick phase.
      onStartOver();
      return;
    }
    documentRef.current = doc.text;

    const stored = loadImportMessages();
    if (stored.length > 0) {
      setTurns(messagesToTurns(stored));
      setHydrated(true);
    } else {
      // First time: fire the initial API call. The document IS the first
      // user turn; no additional user message needed.
      setHydrated(true);
      void fireApiCall([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist turns to sessionStorage after every change.
  useEffect(() => {
    if (!hydrated) return;
    const messages = turnsToMessages(turns);
    if (messages.length === 0) return; // nothing to save yet
    saveImportMessages(messages);
  }, [turns, hydrated]);

  // Scroll to bottom after new content.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, sending]);

  // Auto-grow textarea up to ~6 rows.
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 156)}px`;
  }, []);

  // ── API call ────────────────────────────────────────────────────────

  const fireApiCall = async (currentTurns: Turn[]) => {
    const docText = documentRef.current;
    if (!docText) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/biographer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: docText,
          messages: turnsToMessages(currentTurns),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json() as ConverseResponse;
      setTurns(prev => [
        ...prev,
        { role: 'assistant', content: data.message, stop_reason: data.stop_reason },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  // ── User interactions ───────────────────────────────────────────────

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
        content: 'The user chose to keep talking — continue the conversation before proposing a draft.',
      }],
      _tool_result: true,
    };
    const nextTurns: Turn[] = [...turns, toolResultTurn];
    setTurns(nextTurns);
    await fireApiCall(nextTurns);
  };

  const handleKeepRefining = async (toolUseId: string) => {
    const toolResultTurn: ToolResultUserTurn = {
      role: 'user',
      content: [{
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: 'The user wants to refine the proposed kinlooms — continue the conversation.',
      }],
      _tool_result: true,
    };
    const nextTurns: Turn[] = [...turns, toolResultTurn];
    setTurns(nextTurns);
    await fireApiCall(nextTurns);
  };

  const handlePublish = (input: ProposeDraftInput) => {
    const { title, type_slug, body } = input;
    try {
      sessionStorage.setItem('kinloom:draft-handoff', JSON.stringify({ title, type_slug, body }));
    } catch {
      setError('Could not open the editor — storage may be full.');
      return;
    }
    clearImportSession();
    router.push(`/create/${type_slug}`);
  };

  const handleStartOverInternal = () => {
    clearImportSession();
    onStartOver();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ── Derived ────────────────────────────────────────────────────────

  if (!hydrated) return null;

  const lastTurn = turns[turns.length - 1];
  const pendingToolUse =
    lastTurn?.role === 'assistant' && lastTurn.stop_reason === 'tool_use'
      ? getToolUse(lastTurn.content)
      : null;
  const isAwaitingCard = pendingToolUse !== null;
  const canSend = draft.trim().length > 0 && !sending && !isAwaitingCard;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 48px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={handleStartOverInternal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            color: 'var(--fg-3)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Import
        </button>

        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-4)',
          }}
        >
          Biographer
        </span>

        <span style={{ width: 70 }} />
      </div>

      {/* ── Conversation scroll area ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '64px 56px 0' }}>
        <div style={{ maxWidth: 620 }}>

          {/* Initial loading state — before first response arrives */}
          {turns.length === 0 && sending && (
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 17,
                color: 'var(--fg-4)',
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              Reading your document…
            </p>
          )}

          {turns.map((turn, i) => {
            if (turn.role === 'assistant') {
              const isLast = i === turns.length - 1;
              const toolUse =
                isLast && turn.stop_reason === 'tool_use' ? getToolUse(turn.content) : null;

              return (
                <div key={i} style={{ marginBottom: toolUse ? 0 : 48 }}>
                  <AgentProse content={turn.content} />
                  {toolUse?.name === 'propose_draft' && (
                    <div style={{ marginTop: 32 }}>
                      <ShapingCard
                        toolUseId={toolUse.id}
                        input={toolUse.input as ProposeDraftInput}
                        onPublish={handlePublish}
                        onKeepGoing={handleKeepGoing}
                        onStartOver={handleStartOverInternal}
                      />
                    </div>
                  )}
                  {toolUse?.name === 'split_into_multiple' && (
                    <div style={{ marginTop: 32 }}>
                      <BiographerBatchCard
                        toolUseId={toolUse.id}
                        input={toolUse.input as BatchInput}
                        onKeepRefining={handleKeepRefining}
                      />
                    </div>
                  )}
                </div>
              );
            }

            if ('_tool_result' in turn) return null;

            return (
              <div key={i} style={{ marginBottom: 48 }}>
                <UserQuote content={(turn as TextUserTurn).content} />
              </div>
            );
          })}

          {/* Thinking indicator (after first response) */}
          {sending && turns.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 17,
                  color: 'var(--fg-4)',
                  margin: 0,
                  fontStyle: 'italic',
                }}
              >
                …
              </p>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 14, color: 'var(--destructive)', margin: '0 0 8px', lineHeight: 1.5 }}>
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

          <div ref={endRef} style={{ height: 40 }} />
        </div>
      </div>

      {/* ── Input bar ────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          padding: '18px 56px 24px',
          background: 'var(--background)',
          opacity: isAwaitingCard ? 0.4 : 1,
          pointerEvents: isAwaitingCard ? 'none' : 'auto',
          transition: 'opacity 200ms ease',
        }}
      >
        <div style={{ maxWidth: 620, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
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
        <p style={{ maxWidth: 620, margin: '10px 0 0', fontSize: 12, color: 'var(--fg-4)' }}>
          Enter to send · Shift+Enter for a new line
        </p>
      </div>

    </div>
  );
}
