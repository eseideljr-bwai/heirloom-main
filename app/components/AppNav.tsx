'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../../lib/firebase';

// ─── Icons ────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const PenLineIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HelpCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
  </svg>
);

const LogOutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ─── Nav data ─────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { href: '/home',         label: 'Home',             icon: <HomeIcon /> },
  { href: '/create',       label: 'Create',            icon: <PenLineIcon /> },
  { href: '/library',      label: 'Library',           icon: <BookOpenIcon /> },
  { href: '/family',       label: 'Family',            icon: <UsersIcon /> },
  { href: '/family/feed',  label: 'Family kinlooms',   icon: <BellIcon /> },
  { href: '/legacy-bank',  label: 'AI Legacy Bank',    icon: <SparklesIcon /> },
];

const SECONDARY_NAV = [
  { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
  { href: '/help',     label: 'Help',     icon: <HelpCircleIcon /> },
];

// ─── NavItem ──────────────────────────────────────────────────────────

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '9px 14px', borderRadius: 8,
      fontSize: 14,
      color: active ? '#556b5b' : 'rgba(26,26,26,0.65)',
      background: active ? 'rgba(85,107,91,0.10)' : 'transparent',
      fontWeight: active ? 500 : 400,
      borderLeft: active ? '2px solid #556b5b' : '2px solid transparent',
      textDecoration: 'none',
    }}>
      <span style={{ color: active ? '#556b5b' : 'rgba(26,26,26,0.4)', display: 'flex' }}>{icon}</span>
      {label}
    </Link>
  );
}

// ─── AppNav ───────────────────────────────────────────────────────────

export default function AppNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || (href !== '/home' && pathname.startsWith(href));

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/');
  };

  return (
    <aside style={{
      width: 240, flexShrink: 0,
      position: 'fixed', top: 0, left: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      background: '#fdfcfa',
      borderRight: '1px solid #d4d2cc',
      overflowY: 'auto',
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 4px' }}>
        <Link href="/home" style={{ display: 'block', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 56, width: 'auto' }} />
        </Link>
      </div>

      {/* Primary nav */}
      <nav style={{ flex: 1, padding: '12px 12px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PRIMARY_NAV.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <div style={{ height: 1, background: '#d4d2cc', margin: '16px 4px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {SECONDARY_NAV.map(item => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* User / sign out */}
      <div style={{ padding: '12px 16px 20px', borderTop: '1px solid #d4d2cc' }}>
        <p style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.email}
        </p>
        <button
          onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'rgba(26,26,26,0.55)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <LogOutIcon /> Sign out
        </button>
      </div>
    </aside>
  );
}
