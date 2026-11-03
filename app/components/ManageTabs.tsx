'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Both manage screens have the same two faces: who is here, and what
 *  they see first. Only the labels and routes differ. */
const SETS = {
  home: [
    { href: '/home/manage', label: 'Members and seats', exact: true },
    { href: '/home/manage/featured', label: 'Featured on Home' },
  ],
  space: [
    { href: '/spaces/manage', label: 'Homes and members', exact: true },
    { href: '/spaces/manage/featured', label: 'Featured on the Tapestry' },
  ],
};

export default function ManageTabs({ scope = 'home' }: { scope?: keyof typeof SETS }) {
  const pathname = usePathname();
  const TABS = SETS[scope];
  return (
    <nav className="mg-tabs kmScroll" aria-label="Manage">
      {TABS.map(t => {
        const on = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`mg-tab${on ? ' is-active' : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
