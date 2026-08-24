'use client';

/**
 * The transcript and its composer.
 *
 * PLAIN TEXT ONLY. There is deliberately no markdown renderer here and none
 * should be added. The agent is designed never to emit markdown, so a stray
 * asterisk or backtick must show up on screen as a stray asterisk or
 * backtick — prettifying it would hide the exact defect we would want to
 * see. Message content goes through JSX as a string, nothing else.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FeedbackConversation } from '../../../lib/feedback/conversation-storage';
import type {
  FeedbackMetadata,
  FeedbackReceipt,
} from '../../../lib/feedback/types';
import { labelForBranch } from './chips';
import { ConfirmationCard } from './ConfirmationCard';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ConversationView({
  conversation,
  metadata,
  onSend,
  onStartOver,
  onSent,
  onCancel,
}: {
  conversation: FeedbackConversation;
  metadata: FeedbackMetadata;
  onSend: (text: string) => void;
  onStartOver: () => void;
  onSent: (receipt: FeedbackReceipt) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const replyId = useId();
  const settled = useRef(false);

  const complete = conversation.phase === 'complete';
  const classification = labelForBranch(conversation.branch);

  // While the conversation runs, follow the newest message. When the card
  // appears, stop at the TOP of the card rather than the bottom of the
  // scroller — the user needs to see the title field first, and the
  // transcript above it must stay one scroll away.
  useEffect(() => {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (complete) {
      cardRef.current?.scrollIntoView({ behavior, block: 'start' });
    } else {
      endRef.current?.scrollIntoView({ behavior });
    }
  }, [conversation.messages.length, complete]);

  // Keep focus in the composer as the conversation moves, so answering the
  // next question never needs a Tab or a click. Skipped on mount — the sheet
  // is placing focus at that point and the two would fight.
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    if (!complete) textareaRef.current?.focus();
  }, [conversation.messages.length, complete]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text || complete) return;
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fb-convo">
      {/* Once the conversation starts the chips are gone: the branch they
          chose is fixed, and re-picking one mid-conversation would mean a
          different set of questions. What they picked stays visible as a
          plain label. It is still correctable — the confirmation card's
          Category select is the place to change it. */}
      <div className="fb-convo__head">
        {classification && <p className="fb-convo__tag">{classification}</p>}
        <button type="button" className="fb-text-btn" onClick={onStartOver}>
          Start over
        </button>
      </div>

      <div
        className="fb-transcript"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Feedback conversation"
      >
        {conversation.messages.map(message => (
          <div
            key={message.sequence}
            className={`fb-msg fb-msg--${message.role}`}
          >
            <span className="visually-hidden">
              {message.role === 'user' ? 'You said: ' : 'Assistant said: '}
            </span>
            {message.content}
          </div>
        ))}
        {/* Inline, at the end of the transcript and inside the same scroll
            region — the conversation is still above it and still readable.
            The card does not replace or cover what the user said. */}
        {complete && (
          <div ref={cardRef}>
            <ConfirmationCard
              metadata={metadata}
              conversation={conversation}
              onSent={onSent}
              onCancel={onCancel}
            />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* The composer goes away once the card is up. There is nothing left to
          reply to, and leaving a dead input under the card would read as a
          way to keep talking. */}
      {!complete && (
        <div className="fb-composer">
          <label className="fb-label" htmlFor={replyId}>
            Your reply
          </label>
          <div className="fb-composer__row">
            <textarea
              id={replyId}
              ref={textareaRef}
              className="fb-input fb-composer__field"
              rows={1}
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                adjustHeight();
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="fb-btn fb-btn--primary"
              onClick={send}
              disabled={draft.trim().length === 0}
            >
              Send
            </button>
          </div>
          <p className="fb-hint">Enter to send &middot; Shift+Enter for a new line</p>
        </div>
      )}
    </div>
  );
}
