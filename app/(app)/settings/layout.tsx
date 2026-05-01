import Link from 'next/link';

const SETTINGS_NAV = [
  { href: '/settings',                label: 'Account' },
  { href: '/settings/notifications',  label: 'Notifications' },
  { href: '/settings/privacy',        label: 'Privacy & permissions' },
  { href: '/settings/export',         label: 'Export & backup' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '48px', display: 'flex', gap: 64, alignItems: 'flex-start' }}>
      {/* Settings sub-nav */}
      <aside style={{ width: 200, flexShrink: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
          Settings
        </p>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SETTINGS_NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{ fontSize: 14, color: 'rgba(26,26,26,0.7)', textDecoration: 'none', padding: '8px 12px', borderRadius: 6 }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
