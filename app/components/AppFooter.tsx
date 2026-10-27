'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActiveFamilySpace } from '../../lib/active-family-space';

/**
 * The footer from the Federated Containers design.
 *
 *   row 1 — the "Edit copy" chip, and the footer navigation
 *   row 2 — the active container, what it is, and the privacy claim
 *
 * The prototype's footer also carries a Desktop/Mobile toggle and demo
 * jump links beside the chip. Those belong to its own state switcher
 * (gated there on `showStateSwitcher`) rather than to the product, so
 * they are deliberately not ported.
 */

const FOOTER_NAV = [
  { href: '/home',   label: 'My Home', exact: true },
  { href: '/spaces', label: 'My Family Spaces' },
  { href: '/vault',  label: 'My Vault' },
];

export default function AppFooter({
  /**
   * The design's Home line reads "private to N people", where N is the
   * Home's member count. Nothing exposes that today — FamilySpaceRef
   * carries only ulid, name, member_id and role — so the clause is
   * rendered only once a count is passed, rather than hardcoding the
   * mock's "three". This is the seam the Home entity plugs into.
   */
  homeMemberCount = null,
}: {
  homeMemberCount?: number | null;
}) {
  const pathname = usePathname();
  const { home, activeFamilySpace } = useActiveFamilySpace();

  const inSpaces = pathname === '/spaces' || pathname.startsWith('/spaces/');
  // Names whichever container the page is about: the Space inside /spaces,
  // the person's Home everywhere else.
  const name = (inSpaces ? activeFamilySpace?.name : home?.name)?.trim() || null;

  const parts = inSpaces
    ? [name, 'a Family Space', 'extended family']
    : [
        name,
        'your Family Home',
        homeMemberCount != null
          ? `private to ${homeMemberCount} ${homeMemberCount === 1 ? 'person' : 'people'}`
          : null,
      ];

  const line = [...parts, 'invite-only by design'].filter(Boolean).join(' · ');

  const isActive = (l: (typeof FOOTER_NAV)[number]) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);

  return (
    <footer className="app-footer">
      <div className="app-footer__row">
        {/* Visual only for now — the copy-editing mode is not built. */}
        <button type="button" className="app-footer__chip" disabled>
          Edit copy
        </button>

        <nav className="app-footer__nav" aria-label="Footer">
          {FOOTER_NAV.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`app-footer__link${isActive(l) ? ' is-active' : ''}`}
              aria-current={isActive(l) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="app-footer__line">{line}</p>
    </footer>
  );
}
