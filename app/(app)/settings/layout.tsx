import Link from 'next/link';

const SETTINGS_NAV = [
  { href: '/settings',                label: 'Account' },
  { href: '/settings/notifications',  label: 'Notifications' },
  { href: '/settings/privacy',        label: 'Privacy & permissions' },
  { href: '/settings/export',         label: 'Export & backup' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-layout">
      {/* Settings sub-nav */}
      <aside className="settings-layout__aside">
        <p className="settings-layout__label">Settings</p>
        <nav className="settings-layout__nav">
          {SETTINGS_NAV.map(item => (
            <Link key={item.href} href={item.href} className="settings-layout__link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <div className="settings-layout__body">
        {children}
      </div>
    </div>
  );
}
