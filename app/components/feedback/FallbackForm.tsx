'use client';

/**
 * The path taken when the feedback assistant is unavailable.
 *
 * This is NOT an error state and must not read as one — no warning colour, no
 * icon, no apology. It is a legitimate, complete way to file a report, and it
 * is styled exactly like the rest of the sheet so it looks deliberate rather
 * than degraded.
 */

import { useId, useState } from 'react';
import { submitFeedbackReport } from '../../../lib/feedback/submit';
import { ScreenshotField } from './ScreenshotField';
import type {
  FeedbackCategory,
  FeedbackMetadata,
  FeedbackReceipt,
  FeedbackReport,
} from '../../../lib/feedback/types';

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'bug', label: 'Bug' },
  { value: 'usability', label: 'Usability' },
  { value: 'feature_request', label: 'Feature request' },
  { value: 'content_quality', label: 'Content quality' },
  { value: 'performance', label: 'Performance' },
  { value: 'praise', label: 'Praise' },
  { value: 'other', label: 'Other' },
];

export function FallbackForm({
  metadata,
  initialCategory,
  initialDescription,
  screenshot,
  onScreenshotChange,
  onSent,
  onCancel,
}: {
  metadata: FeedbackMetadata;
  initialCategory: FeedbackCategory | null;
  initialDescription: string;
  screenshot: File | null;
  onScreenshotChange: (file: File | null) => void;
  onSent: (receipt: FeedbackReceipt) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<FeedbackCategory>(
    initialCategory ?? 'bug',
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(initialDescription);
  const [followUpOk, setFollowUpOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const followUpId = useId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || !cleanDescription) {
      setError('Add a title and a description before sending.');
      return;
    }

    setError(null);
    setSubmitting(true);

    const report: FeedbackReport = {
      ...metadata,
      category,
      area: 'unknown',
      severity: 'minor',
      title: cleanTitle,
      summary: cleanDescription,
      steps: null,
      expected: null,
      actual: null,
      contains_personal_content: false,
      follow_up_ok: followUpOk,
      submission_mode: 'fallback_form',
      messages: [],
    };

    try {
      onSent(await submitFeedbackReport(report, screenshot));
    } catch {
      setError('That didn’t send. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="fb-text">
        The feedback assistant is unavailable. You can still send this.
      </p>

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
        <label className="fb-label" htmlFor={descriptionId}>
          Description
        </label>
        <textarea
          id={descriptionId}
          className="fb-input fb-textarea"
          rows={5}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
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

      {/* Text, not colour, carries the message — and it is announced rather
          than appearing silently below the fold. */}
      <p className="fb-error" role="alert">
        {error}
      </p>

      <div className="fb-actions">
        <button
          type="submit"
          className="fb-btn fb-btn--primary"
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
    </form>
  );
}
