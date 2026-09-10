'use client';

/**
 * The three home action cards plus the contextual-hint walkthrough that
 * steps through them (Next → Next → Got it, or Dismiss). Hints only run once
 * the user has at least one kinloom, and only until finished or dismissed.
 */

import Link from 'next/link';
import { useOnboarding } from '../../../lib/onboarding-context';

const AREAS = [
  {
    href: '/create',
    title: 'Create a kinloom',
    desc: 'Capture something worth preserving.',
    hint: 'Three ways in: write it, talk it through, or import photos and letters you already have.',
    primary: true,
  },
  {
    href: '/library',
    title: 'Your library',
    desc: "Review what you've already captured.",
    hint: 'Everything you preserve stays here, private, until you decide to share it.',
    primary: false,
  },
  {
    href: '/family',
    title: 'Family space',
    desc: 'See what your family has shared.',
    hint: 'Kinloom is better with one other person in it. This is where you invite them.',
    primary: false,
  },
] as const;

export default function HomeActions({ hasKinlooms }: { hasKinlooms: boolean }) {
  const { flags, update } = useOnboarding();
  const hintIndex = Math.min(flags.hintIndex ?? 0, AREAS.length - 1);
  const showHints = hasKinlooms && !flags.hintsDone;
  const current = AREAS[hintIndex];
  const isLast = hintIndex >= AREAS.length - 1;

  const next = () => {
    if (isLast) update({ hintsDone: true });
    else update({ hintIndex: hintIndex + 1 });
  };
  const dismiss = () => update({ hintsDone: true });

  return (
    <>
      <div className="home-actions">
        {AREAS.map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            className={
              `home-action${a.primary ? ' is-primary' : ''}` +
              (showHints && i === hintIndex ? ' is-hinted' : '')
            }
          >
            <h3 className="home-action__title">{a.title}</h3>
            <p className="home-action__desc">{a.desc}</p>
          </Link>
        ))}
      </div>

      {showHints && (
        <div className="home-hint" role="note" aria-live="polite">
          <div className="home-hint__body">
            <p className="home-hint__label">{current.title}</p>
            <p className="home-hint__text">{current.hint}</p>
          </div>
          <div className="home-hint__actions">
            <button type="button" className="home-hint__next" onClick={next}>
              {isLast ? 'Got it' : 'Next'}
            </button>
            <button type="button" className="home-hint__dismiss" onClick={dismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}
