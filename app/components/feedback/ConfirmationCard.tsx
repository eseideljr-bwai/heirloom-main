'use client';

/**
 * The confirmation card. This is the screen that matters most.
 *
 * It mirrors the Biographer proposal card (app/(app)/create/import/
 * BiographerBatchCard.tsx) in SHAPE — bordered card, uppercase eyebrow,
 * stacked fields, primary-plus-quiet action row — so the gesture is
 * recognisable.
 *
 * It deliberately does NOT mirror how that card handles editing. There, the
 * fields are read-only text until you find and press a per-row "Edit"
 * button. Here every field is a live control from the moment the card
 * appears: the title is an <input> holding the title, not a heading that
 * happens to be changeable. If this reads as a summary to be approved, users
 * will accept a wrong title rather than correct it, and the data degrades
 * quietly. Nothing here should ever have to be changed by asking the agent.
 */

import { useId, useState } from 'react';
import type { FeedbackConversation } from '../../../lib/feedback/conversation-storage';
import { proposalForBranch } from '../../../lib/feedback/scripted-agent';
import { submitFeedbackReport } from '../../../lib/feedback/submit';
import { ScreenshotField } from './ScreenshotField';
import type {
  FeedbackArea,
  FeedbackCategory,
  FeedbackMetadata,
  FeedbackReceipt,
  FeedbackReport,
  FeedbackSeverity,
} from '../../../lib/feedback/types';

const CATEGORIES: ReadonlyArray<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'usability', label: 'Usability' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'content_quality', label: 'Content quality' },
  { value: 'performance', label: 'Performance' },
  { value: 'praise', label: 'Praise' },
  { value: 'other', label: 'Other' },
];

/**
 * 'unknown' is intentionally absent — it is what the fallback form sends when
 * nobody has classified the report. Once the card is on screen someone has,
 * so the card never offers it.
 */
const AREAS: ReadonlyArray<{ value: FeedbackArea; label: string }> = [
  { value: 'creation_talk', label: 'Talk' },
  { value: 'creation_write', label: 'Write' },
  { value: 'creation_record', label: 'Record' },
  { value: 'creation_import', label: 'Import' },
  { value: 'library', label: 'Library' },
  { value: 'family_space', label: 'Family space' },
  { value: 'legacy_bank', label: 'Legacy Bank' },
  { value: 'account_auth', label: 'Account' },
  { value: 'invites', label: 'Invites' },
  { value: 'media', label: 'Media' },
  { value: 'billing', label: 'Billing' },
  { value: 'other', label: 'Other' },
];

const SEVERITIES: ReadonlyArray<{ value: FeedbackSeverity; label: string }> = [
  { value: 'blocker', label: 'Blocker' },
  { value: 'major', label: 'Major' },
  { value: 'minor', label: 'Minor' },
  { value: 'cosmetic', label: 'Cosmetic' },
];

export function ConfirmationCard({
  metadata,
  conversation,
  screenshot,
  onScreenshotChange,
  onSent,
  onCancel,
}: {
  metadata: FeedbackMetadata;
  conversation: FeedbackConversation;
  screenshot: File | null;
  onScreenshotChange: (file: File | null) => void;
  onSent: (receipt: FeedbackReceipt) => void;
  onCancel: () => void;
}) {
  const proposal = proposalForBranch(conversation.branch);

  const [title, setTitle] = useState(proposal.title);
  const [summary, setSummary] = useState(proposal.summary);
  const [category, setCategory] = useState<FeedbackCategory>(proposal.category);
  const [area, setArea] = useState<FeedbackArea>(proposal.area);
  const [severity, setSeverity] = useState<FeedbackSeverity>(proposal.severity);
  const [followUpOk, setFollowUpOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const summaryId = useId();
  const categoryId = useId();
  const areaId = useId();
  const severityId = useId();
  const followUpId = useId();
  const headingId = useId();

  // Only ever called from the Send button's onClick. Nothing auto-submits:
  // there is no timer, no submit-on-blur, and no form onSubmit that a stray
  // Enter in a text field could trigger.
  const handleSend = async () => {
    if (submitting) return;

    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    if (!cleanTitle || !cleanSummary) {
      setError('Add a title and a summary before sending.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const report: FeedbackReport = {
      ...metadata,
      category,
      area,
      severity,
      title: cleanTitle,
      summary: cleanSummary,
      // No card field maps to these, so nothing fills them. What the user
      // said about steps, expectations and outcomes is in `messages`,
      // verbatim.
      steps: null,
      expected: null,
      actual: null,
      contains_personal_content: false,
      follow_up_ok: followUpOk,
      submission_mode: 'agent',
      // The complete transcript, always, unedited. The summary above is a
      // convenience for triage and must never be the only record of what the
      // user actually said.
      messages: conversation.messages,
    };

    try {
      onSent(await submitFeedbackReport(report, screenshot));
    } catch {
      setError('That didn’t send. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <section className="fb-card" aria-labelledby={headingId}>
      <h3 id={headingId} className="fb-card__eyebrow">
        Your report
      </h3>
      <p className="fb-card__lede">Every field can be edited before you send.</p>

      <div className="fb-field">
        <label className="fb-label" htmlFor={titleId}>
          Title
        </label>
        <input
          id={titleId}
          type="text"
          className="fb-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label" htmlFor={summaryId}>
          Summary
        </label>
        <textarea
          id={summaryId}
          className="fb-input fb-textarea"
          rows={5}
          value={summary}
          onChange={e => setSummary(e.target.value)}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label" htmlFor={categoryId}>
          Category
        </label>
        <select
          id={categoryId}
          className="fb-input fb-select"
          value={category}
          onChange={e => setCategory(e.target.value as FeedbackCategory)}
        >
          {CATEGORIES.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-field">
        <label className="fb-label" htmlFor={areaId}>
          Area
        </label>
        <select
          id={areaId}
          className="fb-input fb-select"
          value={area}
          onChange={e => setArea(e.target.value as FeedbackArea)}
        >
          {AREAS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="fb-field">
        <label className="fb-label" htmlFor={severityId}>
          Severity
        </label>
        <select
          id={severityId}
          className="fb-input fb-select"
          value={severity}
          onChange={e => setSeverity(e.target.value as FeedbackSeverity)}
        >
          {SEVERITIES.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ScreenshotField
        value={screenshot}
        onChange={onScreenshotChange}
        disabled={submitting}
      />

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
        {error}
      </p>

      <div className="fb-actions">
        <button
          type="button"
          className="fb-btn fb-btn--primary"
          onClick={handleSend}
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          className="fb-btn fb-btn--quiet"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
