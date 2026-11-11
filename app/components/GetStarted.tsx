'use client';

import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { GET_STARTED_STEPS, useGetStarted } from '../../lib/get-started';

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

/** The headline follows progress: eight to go, then a countdown. */
function headline(left: number, total: number) {
  if (left === total) return 'Eight small steps to make this home yours.';
  if (left === 0) return 'You know your way around.';
  if (left === 1) return 'One step to go.';
  return `${left} steps to go.`;
}

/**
 * The Get started checklist at the top of My Home. Each row opens its page,
 * where GetStartedTip explains what is there. Stays as a map once every
 * step is checked off; only "Don't show again" removes it.
 */
export default function GetStarted() {
  const { user } = useAuth();
  const gs = useGetStarted(user?.person_id ?? '');

  if (!user || !gs.ready || gs.hidden) return null;
  const total = GET_STARTED_STEPS.length;
  const doneCount = GET_STARTED_STEPS.filter(s => gs.done.includes(s.key)).length;
  const allDone = doneCount === total;

  return (
    <section className="gs" aria-labelledby="gs-title">
      <div className="gs__intro">
        <p className="gs__eyebrow">Get started on Kinloom</p>
        <h2 id="gs-title" className="gs__title">{headline(total - doneCount, total)}</h2>
        <p className="gs__lede">
          {allDone
            ? 'Every step is checked off. Keep this here as a map, or hide it for good below.'
            : 'Each step opens the page it describes, with a short tip showing what is there. Check a step off when you are done and its tip stops appearing.'}
        </p>
        <p className="gs__count">{doneCount} of {total} done</p>
        <div
          className="gs__bar"
          role="progressbar"
          aria-label="Get started progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
        >
          <span className="gs__bar-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
        </div>
        <label className="gs__hide">
          <input type="checkbox" checked={gs.hidden} onChange={e => gs.setHidden(e.target.checked)} />
          Don’t show again
        </label>
      </div>

      <ol className="gs__steps">
        {GET_STARTED_STEPS.map(s => {
          const done = gs.done.includes(s.key);
          return (
            <li key={s.key} className={`gs__step${done ? ' is-done' : ''}`}>
              <input
                type="checkbox"
                className="gs__check"
                checked={done}
                onChange={e => gs.setDone(s.key, e.target.checked)}
                aria-label={`Mark “${s.title}” done`}
              />
              <span className="gs__n" aria-hidden="true">{s.n}</span>
              <Link href={s.href} className="gs__link" onClick={() => gs.walkTo(s.key)}>
                <span className="gs__step-title">{s.title}</span>
                <span className="gs__path">{s.href}</span>
                <span className="gs__arrow"><ArrowIcon /></span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
