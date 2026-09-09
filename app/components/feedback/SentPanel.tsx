'use client';

/**
 * Confirmation. Deliberately flat: no praise, no promise of a fix, a reply,
 * or a timeline.
 *
 * The sheet closes itself after ten seconds so it doesn't sit there needing
 * dismissal. Copying the reference cancels that — someone reaching for the
 * code is mid-task, and having the panel vanish under them would lose the
 * one thing they came back for.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { FeedbackReceipt } from '../../../lib/feedback/types';

const AUTO_CLOSE_MS = 10_000;

export function SentPanel({
  receipt,
  onSendAnother,
  onClose,
}: {
  receipt: FeedbackReceipt;
  onSendAnother: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [autoClose, setAutoClose] = useState(true);
  const referenceLabelId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!autoClose) return;
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [autoClose]);

  const handleCopy = async () => {
    setAutoClose(false);
    try {
      await navigator.clipboard.writeText(receipt.reference);
      setCopied(true);
    } catch {
      // Clipboard can be refused (permissions, insecure context). The code is
      // on screen and selectable either way, so this is not worth an error.
      setCopied(false);
    }
  };

  return (
    <div>
      <p className="fb-sent__headline">Sent.</p>

      <div className="fb-reference" role="group" aria-labelledby={referenceLabelId}>
        <span className="fb-label" id={referenceLabelId}>
          Reference
        </span>
        <div className="fb-reference__row">
          <code className="fb-reference__code">{receipt.reference}</code>
          <button type="button" className="fb-btn fb-btn--quiet" onClick={handleCopy}>
            Copy
          </button>
        </div>
        {/* Announced, and readable as text rather than signalled by colour. */}
        <p className="fb-hint" role="status">
          {copied ? 'Reference copied.' : ''}
        </p>
      </div>

      <p className="fb-text">
        We read every piece of feedback. We can’t reply to all of them.
      </p>

      <div className="fb-actions">
        <button type="button" className="fb-btn fb-btn--quiet" onClick={onSendAnother}>
          Send another
        </button>
      </div>
    </div>
  );
}
