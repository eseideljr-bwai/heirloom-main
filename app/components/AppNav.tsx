'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useActiveFamilySpace } from '../../lib/active-family-space';
import type { AuthUser } from '../../lib/auth';

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

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Family space switcher ────────────────────────────────────────────

function FamilySpaceSwitcher() {
  const { spaces, activeSpace, activeSpaceId, setActiveSpaceId } = useActiveFamilySpace();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (spaces.length === 0) return null;

  const label = activeSpace?.name?.trim() || 'Family space';
  const single = spaces.length === 1;

  return (
    <div className="space-switcher" ref={wrapRef}>
      <button
        type="button"
        className="space-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={single}
        onClick={() => !single && setOpen(o => !o)}
      >
        <span className="space-switcher__label">{label}</span>
        {!single && <ChevronDownIcon />}
      </button>
      {open && !single && (
        <ul className="space-switcher__menu" role="listbox">
          {spaces.map(s => {
            const isActive = s.ulid === activeSpaceId;
            return (
              <li key={s.ulid}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`space-switcher__item${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveSpaceId(s.ulid);
                    setOpen(false);
                  }}
                >
                  <span className="space-switcher__item-name">
                    {s.name?.trim() || s.ulid}
                  </span>
                  {isActive && <CheckIcon />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Nav data ─────────────────────────────────────────────────────────

const PRIMARY_NAV = [
  { href: '/home',         label: 'Home',             icon: <HomeIcon /> },
  { href: '/create',       label: 'Create',            icon: <PenLineIcon /> },
  { href: '/library',      label: 'My Library',        icon: <BookOpenIcon /> },
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

export default function AppNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  // Below 768px the sidebar becomes an off-canvas drawer. Above it,
  // `open` is inert — the trigger and backdrop are display:none and the
  // aside is a static column, exactly as before.
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Navigating is the most common way out of the drawer.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Escape to dismiss, and keep Tab inside the drawer while it covers
  // the page.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const root = navRef.current;
      if (!root) return;
      const stops = root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;
      const outside = !root.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  // Move focus into the drawer on open, hand it back to the trigger on
  // close. `wasOpen` keeps this from stealing focus on first mount.
  //
  // The rAF matters: this effect runs before the browser recomputes
  // style, so the drawer is still `visibility: hidden` at this point and
  // focus() would be silently refused. Waiting a frame lets the
  // `is-open` styles resolve first.
  useEffect(() => {
    const target = open ? closeRef.current : wasOpen.current ? triggerRef.current : null;
    wasOpen.current = open;
    if (!target) return;
    const frame = requestAnimationFrame(() => target.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Rotating to a desktop width would otherwise leave the body scroll
  // locked with no visible way to close.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isActive = (href: string) =>
    pathname === href || (href !== '/home' && pathname.startsWith(href));

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  return (
    <>
      <header className="app-topbar">
        <button
          ref={triggerRef}
          type="button"
          className="app-topbar__menu"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="app-nav"
          onClick={() => setOpen(true)}
        >
          <MenuIcon />
        </button>
        <Link href="/home" className="app-topbar__logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" />
        </Link>
      </header>

      <div
        className={`app-nav__backdrop${open ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      <aside id="app-nav" ref={navRef} className={`app-nav${open ? ' is-open' : ''}`}>
        <div className="app-nav__head">
          <Link href="/home" className="app-nav__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-kinloom.png" alt="Kinloom" />
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="app-nav__close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="app-nav__space">
          <FamilySpaceSwitcher />
        </div>

        <nav className="app-nav__nav">
          <div className="app-nav__group">
            {PRIMARY_NAV.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>

          <div className="app-nav__rule" />

          <div className="app-nav__group">
            {SECONDARY_NAV.map(item => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>
        </nav>

        <div className="app-nav__foot">
          <p className="app-nav__email">{user.email}</p>
          <button onClick={handleSignOut} className="app-nav__signout">
            <LogOutIcon /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
