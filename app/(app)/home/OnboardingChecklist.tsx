'use client';

/**
 * "Build Your Family Space" — the getting-started checklist on Home.
 *
 * Completion is a mix of real data (kinloom count, invitations — passed in
 * from the server component) and browser flags for the items the backend
 * has no signal for (Talk/Import tried, Legacy Bank visited, feedback sent).
 * "Hide for now" collapses it into a small button in the sidebar.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useOnboarding } from '../../../lib/onboarding-context';
import { ONBOARDING_TASK_TOTAL } from '../../../lib/onboarding';
import { useFeedback } from '../../components/feedback/FeedbackContext';

const SUPPORT_MAILTO = 'mailto:hello@kinloom.com?subject=Kinloom%20feedback';

type Item = {
  key: string;
  label: string;
  done: boolean;
  href?: string;
  onClick?: () => void;
};

function CheckMark() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function OnboardingChecklist({
  totalKinlooms,
  invited,
}: {
  totalKinlooms: number;
  invited: boolean;
}) {
  const { flags, setChecklistHidden, setProgressDone, markTask } = useOnboarding();
  const feedback = useFeedback();
  const local = flags.tasks ?? {};

  const items: Item[] = [
    { key: 'first',    label: 'Create your first Kinloom', done: totalKinlooms >= 1, href: '/create/start' },
    { key: 'agent',    label: 'Try Talk or Import',        done: !!local.agent,      href: '/create/talk' },
    { key: 'another',  label: 'Create another Kinloom',    done: totalKinlooms >= 2, href: '/create/start' },
    { key: 'invite',   label: 'Invite a family member',    done: invited,            href: '/family/members' },
    { key: 'legacy',   label: 'Explore your Legacy Bank',  done: !!local.legacy,     href: '/legacy-bank' },
    {
      key: 'feedback',
      label: 'Leave feedback',
      done: !!local.feedback,
      ...(feedback.enabled
        ? { onClick: feedback.openSheet }
        : { href: SUPPORT_MAILTO, onClick: () => markTask('feedback') }),
    },
  ];

  const done = items.filter(i => i.done).length;

  // Let the sidebar show "N of 6 complete" on pages that don't compute it.
  useEffect(() => { setProgressDone(done); }, [done, setProgressDone]);

  if (flags.checklistHidden) return null;

  return (
    <section className="onb-checklist" aria-labelledby="onb-checklist-title">
      <div className="onb-checklist__head">
        <div className="onb-checklist__intro">
          <h2 id="onb-checklist-title" className="onb-checklist__title">Build Your Family Space</h2>
          <p className="onb-checklist__lede">
            A few simple steps will help you experience what Kinloom can become.
          </p>
        </div>
        <div className="onb-checklist__progress">
          <div
            className="onb-checklist__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ONBOARDING_TASK_TOTAL}
            aria-valuenow={done}
            data-done={done}
          >
            <div className="onb-checklist__bar" />
          </div>
          <p className="onb-checklist__count">{done} of {ONBOARDING_TASK_TOTAL} complete</p>
        </div>
      </div>

      <ul className="onb-checklist__items">
        {items.map(item => {
          const inner = (
            <>
              <span className={`onb-checklist__mark${item.done ? ' is-done' : ''}`} aria-hidden="true">
                {item.done && <CheckMark />}
              </span>
              <span className={`onb-checklist__label${item.done ? ' is-done' : ''}`}>{item.label}</span>
            </>
          );
          return (
            <li key={item.key}>
              {item.href && !item.href.startsWith('mailto:') ? (
                <Link href={item.href} className="onb-checklist__item" onClick={item.onClick} aria-label={`${item.label}${item.done ? ' (done)' : ''}`}>
                  {inner}
                </Link>
              ) : item.href ? (
                <a href={item.href} className="onb-checklist__item" onClick={item.onClick} aria-label={`${item.label}${item.done ? ' (done)' : ''}`}>
                  {inner}
                </a>
              ) : (
                <button type="button" className="onb-checklist__item" onClick={item.onClick} aria-label={`${item.label}${item.done ? ' (done)' : ''}`}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="onb-checklist__foot">
        <Link href="/welcome" className="onb-checklist__link">See welcome screen</Link>
        <button type="button" className="onb-checklist__hide" onClick={() => setChecklistHidden(true)}>
          Hide for now
        </button>
      </div>
    </section>
  );
}
