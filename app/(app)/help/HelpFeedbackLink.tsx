'use client';

import { useFeedback } from '../../components/feedback/FeedbackContext';
import { useOnboarding } from '../../../lib/onboarding-context';

const SUPPORT_MAILTO = 'mailto:hello@kinloom.com?subject=Kinloom%20feedback';

/**
 * "Leave feedback" — opens the in-app feedback sheet when the tool is on,
 * otherwise falls back to email so the link is never a dead end.
 */
export default function HelpFeedbackLink() {
  const feedback = useFeedback();
  const { markTask } = useOnboarding();

  if (feedback.enabled) {
    return (
      <button type="button" className="help-page__foot-muted" onClick={feedback.openSheet} aria-haspopup="dialog">
        Leave feedback
      </button>
    );
  }
  return (
    <a href={SUPPORT_MAILTO} className="help-page__foot-muted" onClick={() => markTask('feedback')}>
      Leave feedback
    </a>
  );
}
