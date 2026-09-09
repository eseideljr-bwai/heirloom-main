'use client';

/**
 * Dev-only state switcher. Gated on FEEDBACK_DEV_TOOLS, which requires BOTH
 * the feature flag and a non-production build — it cannot reach a deployed
 * environment even if the flag is turned on there.
 *
 * Styled to be unmistakably not part of the product: monospace, magenta,
 * dashed. If this ever shows up in a screenshot, it should be obvious at a
 * glance that something is misconfigured.
 */

import type { EntryVariant } from '../../../lib/feedback/config';
import type { SheetView } from './FeedbackSheet';

export function FeedbackDevSwitcher({
  variant,
  onVariantChange,
  onForceView,
}: {
  variant: EntryVariant;
  onVariantChange: (variant: EntryVariant) => void;
  onForceView: (view: SheetView) => void;
}) {
  return (
    <div className="fb-dev" aria-label="Feedback dev tools">
      <p className="fb-dev__title">DEV — not part of the product</p>

      <div className="fb-dev__row">
        <span className="fb-dev__legend">state</span>
        <button type="button" className="fb-dev__btn" onClick={() => onForceView('composer')}>
          composer
        </button>
        <button type="button" className="fb-dev__btn" onClick={() => onForceView('fallback')}>
          fallback
        </button>
        <button type="button" className="fb-dev__btn" onClick={() => onForceView('sent')}>
          sent
        </button>
      </div>

      <div className="fb-dev__row">
        <span className="fb-dev__legend">entry</span>
        <button
          type="button"
          className={`fb-dev__btn${variant === 'visible' ? ' is-on' : ''}`}
          onClick={() => onVariantChange('visible')}
        >
          visible
        </button>
        <button
          type="button"
          className={`fb-dev__btn${variant === 'quiet' ? ' is-on' : ''}`}
          onClick={() => onVariantChange('quiet')}
        >
          quiet
        </button>
      </div>
    </div>
  );
}
