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
import ReactMarkdown from 'react-markdown';
import type { ContentBlock, MessageParam, ConverseResponse } from '../../../../lib/agent/types';
import {
  loadImportDocument,
  loadImportMessages,
  saveImportMessages,
  clearImportSession,
} from '../../../../lib/biographer/client-storage';
import { ShapingCard, type ProposeDraftInput } from '../talk/ShapingCard';
import { BiographerBatchCard, type BatchInput } from './BiographerBatchCard';
import { BiographerChoiceCard, type ChoicesInput } from './BiographerChoiceCard';

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

function getText(content: ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type !== 'text') continue;
    const text = typeof block.text === 'string' ? block.text : '';
    if (text.trim()) parts.push(text);
  }
  return parts.join('\n\n').trim();
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

// Find the answer submitted for a given tool_use_id, if any. Used to render
// ask_choices cards in their answered (locked) state further up the transcript.
function findToolResultContent(turns: Turn[], toolUseId: string): string | null {
  for (const turn of turns) {
    if (turn.role !== 'user' || !('_tool_result' in turn)) continue;
    for (const block of turn.content) {
      if (block.tool_use_id === toolUseId) return block.content;
    }
  }
  return null;
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

// Serif-styled markdown so **bold**, lists, etc. render as formatting
// rather than as literal characters.
const proseText: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 19,
  lineHeight: 1.82,
  color: 'var(--fg-1)',
};

function AgentProse({ content }: { content: ContentBlock[] }) {
  const text = getText(content);
  if (!text) return null;
  return (
    <div style={proseText}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: '0 0 20px' }}>{children}</p>,
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          ul: ({ children }) => (
            <ul style={{ margin: '0 0 20px', paddingLeft: 24 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '0 0 20px', paddingLeft: 24 }}>{children}</ol>
          ),
          li: ({ children }) => <li style={{ margin: '0 0 6px' }}>{children}</li>,
          a: ({ children, href }) => (
            <a href={href} style={{ color: 'var(--primary)' }}>{children}</a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
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
  const bootedRef = useRef(false);

  // ── Boot: load document + restore or start session ─────────────────

  useEffect(() => {
    // Guard against React StrictMode's double-invoke (and any remount) so the
    // first turn fires exactly once instead of generating twice.
    if (bootedRef.current) return;
    bootedRef.current = true;

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

  // Close a pending tool_use by appending its tool_result, then resume the
  // conversation. Both button taps and typed replies route through here so a
  // dangling tool_use never reaches the API (which would 400).
  const submitToolResult = async (toolUseId: string, content: string) => {
    const toolResultTurn: ToolResultUserTurn = {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUseId, content }],
      _tool_result: true,
    };
    const nextTurns: Turn[] = [...turns, toolResultTurn];
    setTurns(nextTurns);
    await fireApiCall(nextTurns);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Edge case: if an ask_choices card is pending and the user types instead
    // of tapping, the reply must still close that tool_use with a tool_result.
    if (pendingToolUse?.name === 'ask_choices') {
      await submitToolResult(pendingToolUse.id, text);
      return;
    }

    const userTurn: TextUserTurn = { role: 'user', content: text };
    const nextTurns: Turn[] = [...turns, userTurn];
    setTurns(nextTurns);
    await fireApiCall(nextTurns);
  };

  // Button-tap path for ask_choices. Assemble one "Q → A" line per question
  // (or just the single answer) into the tool_result content.
  const handleChoices = async (toolUseId: string, answers: string[]) => {
    const questions =
      (pendingToolUse?.input as ChoicesInput | undefined)?.questions ?? [];
    const content =
      answers.length === 1
        ? answers[0]
        : questions
            .map((q, i) => `${q.question} → ${answers[i] ?? ''}`)
            .join('\n');
    await submitToolResult(toolUseId, content);
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

  const handleKeepGoing = (toolUseId: string) =>
    submitToolResult(
      toolUseId,
      'The user chose to keep talking — continue the conversation before proposing a draft.',
    );

  const handleKeepRefining = (toolUseId: string) =>
    submitToolResult(
      toolUseId,
      'The user wants to refine the proposed kinlooms — continue the conversation.',
    );

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

  const handleBatchPublished = () => {
    clearImportSession();
    router.push('/library');
    router.refresh();
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
  // ask_choices is a mid-conversation elicitation — the reply box stays open so
  // the user can type a free-text answer instead of tapping. The terminal cards
  // (propose_draft, split_into_multiple) block the input until acted on.
  const isBlockingCard = pendingToolUse !== null && pendingToolUse.name !== 'ask_choices';
  const canSend = draft.trim().length > 0 && !sending && !isBlockingCard;

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
                turn.stop_reason === 'tool_use' ? getToolUse(turn.content) : null;
              // Terminal cards only render on the last turn (they hand off).
              // ask_choices renders in every turn so answered cards persist.
              const terminalCard =
                isLast && (toolUse?.name === 'propose_draft' || toolUse?.name === 'split_into_multiple')
                  ? toolUse
                  : null;
              const choiceCard = toolUse?.name === 'ask_choices' ? toolUse : null;
              const showCard = terminalCard || choiceCard;

              return (
                <div key={i} style={{ marginBottom: showCard ? 0 : 48 }}>
                  <AgentProse content={turn.content} />
                  {terminalCard?.name === 'propose_draft' && (
                    <div style={{ marginTop: 32 }}>
                      <ShapingCard
                        toolUseId={terminalCard.id}
                        input={terminalCard.input as ProposeDraftInput}
                        onPublish={handlePublish}
                        onKeepGoing={handleKeepGoing}
                        onStartOver={handleStartOverInternal}
                      />
                    </div>
                  )}
                  {terminalCard?.name === 'split_into_multiple' && (
                    <div style={{ marginTop: 32 }}>
                      <BiographerBatchCard
                        toolUseId={terminalCard.id}
                        input={terminalCard.input as BatchInput}
                        onKeepRefining={handleKeepRefining}
                        onAllPublished={handleBatchPublished}
                      />
                    </div>
                  )}
                  {choiceCard && (
                    <div style={{ marginTop: 32 }}>
                      <BiographerChoiceCard
                        toolUseId={choiceCard.id}
                        input={choiceCard.input as ChoicesInput}
                        onSubmit={handleChoices}
                        answerText={findToolResultContent(turns, choiceCard.id) ?? undefined}
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
          opacity: isBlockingCard ? 0.4 : 1,
          pointerEvents: isBlockingCard ? 'none' : 'auto',
          transition: 'opacity 200ms ease',
        }}
      >
        <div style={{ maxWidth: 620, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={draft}
            rows={1}
            disabled={sending || isBlockingCard}
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
