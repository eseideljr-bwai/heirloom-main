'use client';

/**
 * The feedback sheet — a slide-over from the right.
 *
 * IT DOES NOT CHANGE THE ROUTE. The page behind stays mounted, visible and
 * unchanged; this is pure client state layered on top of it.
 *
 * There is no reusable sheet primitive in this codebase (see the UI-0 audit).
 * The focus/Escape/scroll-lock mechanics here are ported from the mobile nav
 * drawer in app/components/AppNav.tsx, which is the one place that already
 * gets them right — including the requestAnimationFrame before focus(), which
 * is required because the panel is still visibility:hidden when the effect
 * runs and focus() would otherwise be silently refused.
 *
 * This component owns the conversation state. The transcript renders it, and
 * the confirmation card will read it — the messages array is already in
 * payload shape, so nothing converts it on the way out.
 */

import { useEffect, useId, useRef, useState } from 'react';
import {
  clearConversation,
  loadConversation,
  saveConversation,
  type FeedbackConversation,
} from '../../../lib/feedback/conversation-storage';
import { submitFeedbackReport } from '../../../lib/feedback/submit';
import { advance, startConversation } from '../../../lib/feedback/scripted-agent';
import type {
  FeedbackCategory,
  FeedbackMetadata,
  FeedbackReceipt,
  FeedbackReport,
} from '../../../lib/feedback/types';
import { CHIPS } from './chips';
import { ConversationView } from './ConversationView';
import { FallbackForm } from './FallbackForm';
import { ScreenshotField } from './ScreenshotField';
import { SentPanel } from './SentPanel';

export type SheetView = 'composer' | 'conversation' | 'fallback' | 'sent';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The scripted stand-in is always available. When a real agent lands this
 * becomes a genuine check, and a false answer routes to the fallback form
 * exactly as it does today.
 */
function isAgentAvailable(): boolean {
  return true;
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function FeedbackSheet({
  metadata,
  initialView,
  onClose,
}: {
  metadata: FeedbackMetadata;
  initialView: SheetView;
  onClose: () => void;
}) {
  // Reading sessionStorage in an initializer is safe here: the sheet is
  // rendered only after an open click, never during SSR or hydration.
  const [conversation, setConversation] = useState<FeedbackConversation | null>(
    () => loadConversation(),
  );
  const [view, setView] = useState<SheetView>(
    initialView !== 'composer'
      ? initialView
      : conversation
        ? 'conversation'
        : 'composer',
  );
  const [chip, setChip] = useState<FeedbackCategory | null>(null);
  const [note, setNote] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [followUpOk, setFollowUpOk] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // The dev switcher can drop straight into the sent state, which has no real
  // receipt behind it. Nothing was submitted to produce this one.
  const [receipt, setReceipt] = useState<FeedbackReceipt | null>(() =>
    initialView === 'sent' ? { id: 'dev-forced', reference: 'KL-DEV0' } : null,
  );

  const panelRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const noteId = useId();
  const followUpId = useId();

  // Closing the sheet mid-conversation must not lose the conversation, so
  // every change is written through immediately.
  useEffect(() => {
    if (conversation) saveConversation(conversation);
  }, [conversation]);

  // Escape from any state, and keep Tab inside the panel while it is open.
  //
  // Registered on the CAPTURE phase and stopped immediately, so while the
  // sheet is open it is the only thing handling these two keys. The mobile
  // nav drawer (app/components/AppNav.tsx) also puts an Escape-and-Tab
  // handler on the document, and the feedback nav item can be pressed while
  // that drawer is open — without this, one Escape would close both and the
  // two Tab traps would fight over focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Tab') return;
      e.stopImmediatePropagation();

      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const root = panelRef.current;
      if (!root) return;
      const stops = root.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const outside = !root.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // The page behind must not scroll while the sheet covers it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Move focus into the panel on open, and to the top of each new view as the
  // user moves through the flow — otherwise focus is left on a control that
  // has just been replaced.
  useEffect(() => {
    const frame = requestAnimationFrame(() => viewRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [view]);

  const handleContinue = () => {
    if (!isAgentAvailable()) {
      setView('fallback');
      return;
    }
    setConversation(startConversation(chip, note));
    setView('conversation');
  };

  const handleReply = (text: string) => {
    setConversation(current => (current ? advance(current, text) : current));
  };

  const handleStartOver = () => {
    clearConversation();
    setConversation(null);
    setChip(null);
    setNote('');
    setScreenshot(null);
    setFollowUpOk(false);
    setSendError(null);
    setView('composer');
  };

  const handleSent = (next: FeedbackReceipt) => {
    // A submitted conversation must not come back on the next open. The
    // report is gone; restoring the transcript would invite a second send.
    clearConversation();
    setConversation(null);
    setReceipt(next);
    setView('sent');
  };

  const handleSendAnother = () => {
    clearConversation();
    setConversation(null);
    setChip(null);
    setNote('');
    setScreenshot(null);
    setFollowUpOk(false);
    setSendError(null);
    setReceipt(null);
    setView('composer');
  };

  const handleSendNow = async () => {
    const description = note.trim();
    if (!description || sending) return;

    setSendError(null);
    setSending(true);

    const report: FeedbackReport = {
      ...metadata,
      category: chip ?? 'other',
      area: 'unknown',
      severity: 'minor',
      title: description.slice(0, 80),
      summary: description,
      steps: null,
      expected: null,
      actual: null,
      contains_personal_content: false,
      follow_up_ok: followUpOk,
      submission_mode: 'fallback_form',
      messages: [],
    };

    try {
      handleSent(await submitFeedbackReport(report, screenshot));
    } catch {
      setSendError('That didn’t send. Try again.');
      setSending(false);
    }
  };

  const canSend = note.trim().length > 0;
  const canContinue = canSend || chip !== null;

  return (
    <div className="fb-overlay">
      <div className="fb-overlay__scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        className="fb-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <div className="fb-sheet__head">
          <h2 id={headingId} className="fb-sheet__title">
            Send feedback
          </h2>
          <button
            type="button"
            className="fb-icon-btn"
            onClick={onClose}
            aria-label="Close feedback"
          >
            <CloseIcon />
          </button>
        </div>

        <div
          ref={viewRef}
          className={`fb-sheet__body${view === 'conversation' ? ' fb-sheet__body--flush' : ''}`}
          tabIndex={-1}
        >
          {view === 'composer' && (
            <>
              <p className="fb-text">
                Tell us what broke, what confused you, or what you wish Kinloom
                did.
              </p>

              <fieldset className="fb-fieldset">
                <legend className="fb-label">What kind of feedback</legend>
                <div className="fb-chips">
                  {CHIPS.map(option => {
                    const selected = chip === option.category;
                    return (
                      <button
                        key={option.category}
                        type="button"
                        className={`fb-chip${selected ? ' is-selected' : ''}`}
                        aria-pressed={selected}
                        onClick={() =>
                          setChip(selected ? null : option.category)
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="fb-field">
                <label className="fb-label" htmlFor={noteId}>
                  What happened
                </label>
                <textarea
                  id={noteId}
                  className="fb-input fb-textarea"
                  rows={5}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              <ScreenshotField value={screenshot} onChange={setScreenshot} />

              <div className="fb-check">
                <input
                  id={followUpId}
                  type="checkbox"
                  className="fb-checkbox"
                  checked={followUpOk}
                  onChange={e => setFollowUpOk(e.target.checked)}
                />
                <label className="fb-check__label" htmlFor={followUpId}>
                  You can email me about this
                </label>
              </div>

              <p className="fb-error" role="alert">
                {sendError}
              </p>

              <div className="fb-actions">
                <button
                  type="button"
                  className="fb-btn fb-btn--primary"
                  onClick={handleSendNow}
                  disabled={!canSend || sending}
                >
                  {sending ? 'Sending…' : 'Send'}
                </button>
                <button
                  type="button"
                  className="fb-btn fb-btn--quiet"
                  onClick={handleContinue}
                  disabled={!canContinue || sending}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {view === 'conversation' && conversation && (
            <ConversationView
              conversation={conversation}
              metadata={metadata}
              screenshot={screenshot}
              onScreenshotChange={setScreenshot}
              onSend={handleReply}
              onStartOver={handleStartOver}
              onSent={handleSent}
              onCancel={onClose}
            />
          )}

          {view === 'fallback' && (
            <FallbackForm
              metadata={metadata}
              initialCategory={chip}
              initialDescription={note}
              screenshot={screenshot}
              onScreenshotChange={setScreenshot}
              onSent={handleSent}
              onCancel={onClose}
            />
          )}

          {view === 'sent' && receipt && (
            <SentPanel
              receipt={receipt}
              onSendAnother={handleSendAnother}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
