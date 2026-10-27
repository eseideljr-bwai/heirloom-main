'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SETTINGS_NAV = [
  { href: '/settings',               label: 'Account' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/privacy',       label: 'Privacy & permissions' },
  { href: '/settings/export',        label: 'Export & backup' },
];

export default function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="settings-layout__nav" aria-label="Settings">
      {SETTINGS_NAV.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`settings-layout__link${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
