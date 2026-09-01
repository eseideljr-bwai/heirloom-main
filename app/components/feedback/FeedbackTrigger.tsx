'use client';

/**
 * The persistent affordance, bottom-right of the authenticated app.
 *
 * Two variants ship behind a switch (see DEFAULT_ENTRY_VARIANT):
 *
 *   'visible' — filled sage. Findable during beta, still smaller and lower
 *               in the visual hierarchy than any creation CTA.
 *   'quiet'   — outlined, neutral, sits on the page background.
 *
 * Quiet means low visual WEIGHT, never low contrast: both variants carry a
 * ≥4.5:1 label and a ≥3:1 boundary. The quiet variant's border is
 * deliberately not var(--border), which is a 1.5:1 hairline meant for
 * non-interactive dividers.
 */

import type { EntryVariant } from '../../../lib/feedback/config';

function MessageIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function FeedbackTrigger({
  variant,
  expanded,
  onOpen,
}: {
  variant: EntryVariant;
  expanded: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`fb-trigger fb-trigger--${variant}`}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
    >
      <MessageIcon />
      Send feedback
    </button>
  );
}

/**
 * The same entry point as an item in the app nav. Visually a sibling of
 * NavItem in AppNav, but a real button — it opens a sheet, it does not
 * navigate, and rendering it as a link would promise a route change that
 * never happens.
 */
export function FeedbackNavItem({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="fb-nav-item"
      onClick={onOpen}
      aria-haspopup="dialog"
    >
      <span className="fb-nav-item__icon">
        <MessageIcon />
      </span>
      Send feedback
    </button>
  );
}
