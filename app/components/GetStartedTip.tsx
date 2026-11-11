'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AuthUser } from '../../lib/auth';
import { GET_STARTED_STEPS, useGetStarted, type StepKey } from '../../lib/get-started';

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/** Room between the tip and the edge of the window, and from the arrow to the tip's edge. */
const GUTTER = 16;
const ARROW_INSET = 32;

type Place = { top: number; left?: number; right?: number; arrow: number };

/**
 * The tip renders inside the header, so it shares the header's stacking
 * context: above the nav bar, and below the account and Family Space menus
 * (their z-index only counts inside that context). It is placed relative to
 * the header, which is sticky, so it stays put as the page scrolls.
 */
const host = () => document.querySelector<HTMLElement>('.topnav');

/**
 * Where the tip sits: just under its nav anchor, pointing at it. Anchors on
 * the left of the bar open rightwards and those on the right open leftwards,
 * so the tip never runs off the window. Below 900px the nav links live in
 * the drawer, so the tip points at the menu button instead.
 */
function place(anchor: string, header: HTMLElement): Place | null {
  let el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
  if (!el || el.getBoundingClientRect().width === 0) el = document.querySelector<HTMLElement>('[data-tour="menu"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const h = header.getBoundingClientRect();
  const center = r.left + r.width / 2;
  const top = r.bottom + 12 - h.top;
  const vw = document.documentElement.clientWidth;
  if (center < vw / 2) {
    const left = Math.max(GUTTER, center - ARROW_INSET);
    return { top, left: left - h.left, arrow: center - left };
  }
  const right = Math.max(GUTTER, vw - center - ARROW_INSET);
  return { top, right: right - (vw - h.right), arrow: vw - center - right };
}

/**
 * The Get started tip for the page you are on, if that page is one of the
 * steps. Shown until its step is checked off; × closes it for this page
 * view only. Previous/Next walk the steps in order. Lives in the shell so
 * every step page gets it without knowing about it.
 */
export default function GetStartedTip({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const gs = useGetStarted(user.person_id);

  // Checking "Done" leaves the tip up until you move on, so Next stays in
  // reach; it is from the next visit on that it stops appearing. The pin
  // also holds the step itself: the Tapestry only matches while the walk
  // that led there is live, and arriving clears the walk. Keyed to the
  // page, so it never outlives it, even for the render before effects run.
  const [pin, setPin] = useState<{ key: StepKey; path: string } | null>(null);
  const pinned = pin?.path === pathname ? pin.key : null;

  const ctx = { personId: user.person_id, walking: gs.walking, noSpaces: user.spaces.length === 0 };
  let index = GET_STARTED_STEPS.findIndex(s => s.matches(pathname, ctx));
  if (index < 0 && pinned) index = GET_STARTED_STEPS.findIndex(s => s.key === pinned);
  const step = index >= 0 ? GET_STARTED_STEPS[index] : null;

  // × closes the tip on this page only. It is back the next time the page
  // is opened, until its step is checked off.
  const [closedOn, setClosedOn] = useState<string | null>(null);
  const closed = closedOn === pathname;

  // Both are for this page view only: leaving and coming back starts over.
  useEffect(() => { setPin(null); setClosedOn(null); }, [pathname]);

  const eligible = !!step && gs.ready && !gs.hidden && !closed && !gs.done.includes(step.key);

  const { walkTo, walking } = gs;
  useEffect(() => {
    if (!eligible || !step) return;
    setPin({ key: step.key, path: pathname });
    if (walking === step.key) walkTo(null);
  }, [eligible, step, walking, walkTo, pathname]);

  const visible = !!step && gs.ready && !gs.hidden && !closed
    && (eligible || pinned === step.key);

  const [pos, setPos] = useState<Place | null>(null);
  const [header, setHeader] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!visible || !step) return;
    const update = () => {
      const h = host();
      setHeader(h);
      setPos(h ? place(step.anchor, h) : null);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [visible, step]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setClosedOn(pathname); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, pathname]);

  if (!visible || !step || !pos || !header) return null;

  const prev = index > 0 ? GET_STARTED_STEPS[index - 1] : null;
  const next = GET_STARTED_STEPS[index + 1] ?? null;
  const total = GET_STARTED_STEPS.length;
  const done = gs.done.includes(step.key);
  const titleId = `gs-tip-${step.key}`;

  return createPortal(
    <div
      className={`gs-tip${pos.right !== undefined ? ' gs-tip--end' : ''}`}
      role="dialog"
      aria-labelledby={titleId}
      style={{
        top: pos.top,
        left: pos.left,
        right: pos.right,
        ['--gs-arrow' as string]: `${pos.arrow}px`,
      }}
    >
      <div className="gs-tip__head">
        <p className="gs-tip__eyebrow">Get started · step {step.n} of {total}</p>
        <button type="button" className="gs-tip__close" aria-label="Close this tip" onClick={() => setClosedOn(pathname)}>
          <CloseIcon />
        </button>
      </div>
      <h2 id={titleId} className="gs-tip__title">{step.title}</h2>
      <p className="gs-tip__body">{step.tip}</p>
      <p className="gs-tip__where">{step.where}</p>

      <div className="gs-tip__foot">
        <label className="gs-tip__done">
          <input type="checkbox" checked={done} onChange={e => gs.setDone(step.key, e.target.checked)} />
          Done
        </label>
        <div className="gs-tip__nav">
          {prev ? (
            <Link href={prev.href} className="gs-tip__prev" onClick={() => gs.walkTo(prev.key)}>
              ← Previous
            </Link>
          ) : (
            <button type="button" className="gs-tip__prev" aria-disabled="true" disabled>
              ← Previous
            </button>
          )}
          {next ? (
            <Link href={next.href} className="gs-tip__next" onClick={() => gs.walkTo(next.key)}>
              Next: {next.nextLabel ?? next.title} →
            </Link>
          ) : (
            <Link href="/home" className="gs-tip__next" onClick={() => gs.walkTo(null)}>
              Back to Get started →
            </Link>
          )}
        </div>
      </div>
    </div>,
    header,
  );
}
