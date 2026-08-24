/**
 * The four opening chips, and the label each one keeps once the conversation
 * has started. Shared so the composer and the transcript can't drift apart on
 * wording.
 */

import type { ScriptBranch } from '../../../lib/feedback/scripted-agent';
import type { FeedbackCategory } from '../../../lib/feedback/types';

export const CHIPS: ReadonlyArray<{
  label: string;
  category: FeedbackCategory;
}> = [
  { label: "Something's broken", category: 'bug' },
  { label: 'This was confusing', category: 'usability' },
  { label: 'I wish it did something', category: 'feature_request' },
  { label: 'Something I liked', category: 'praise' },
];

/** Null for an unclassified conversation — there is nothing to show. */
export function labelForBranch(branch: ScriptBranch): string | null {
  const match = CHIPS.find(chip => chip.category === branch);
  return match?.label ?? null;
}
