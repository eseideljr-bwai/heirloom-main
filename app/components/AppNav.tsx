'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { useActiveFamilySpace } from '../../lib/active-family-space';
import type { AuthUser } from '../../lib/auth';
import { useFeedback } from './feedback/FeedbackContext';
import { FeedbackNavItem } from './feedback/FeedbackTrigger';

// ─── Icons ────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
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

// ─── Nav model ────────────────────────────────────────────────────────

/**
 * Two levels, per the Federated Containers design.
 *
 *   Row 1 — your own Home. A person has one Vault and one Home, so these
 *           are fixed destinations, not the "active container's page".
 *   Row 2 — the active Family Space. Rendered only inside /spaces.
 *
 * A person belongs to any number of Family Spaces but exactly one Home,
 * which is why the switcher sits on row 2 and lists Family Spaces only.
 * Homes never appear in it — My Home is reached from row 1 instead.
 */
type NavLink = {
  href: string;
  label: string;
  /** Match exactly: `/home` must not light up on `/home/manage`. */
  exact?: boolean;
  /** Rendered only for containers that carry lineage. */
  lineageOnly?: boolean;
  /**
   * Highlight on this prefix instead of `href`. The account links point at
   * `/me` resolvers that redirect to a member id, so the href they are
   * clicked from is never the path they land on.
   */
  match?: string;
};

const HOME_NAV: NavLink[] = [
  { href: '/home',        label: 'My Home', exact: true },
  { href: '/spaces',      label: 'Family Spaces' },
  { href: '/library',     label: 'Our Library' },
  { href: '/home/manage', label: 'Manage Home' },
];

const ACCOUNT_NAV: NavLink[] = [
  { href: '/vault',          label: 'My Vault' },
  { href: '/portrait/me',    label: 'My Portrait',    match: '/portrait' },
  { href: '/legacy-bank/me', label: 'My Legacy Bank', match: '/legacy-bank' },
];

const SPACE_NAV: NavLink[] = [
  { href: '/spaces/tapestry',    label: 'Family Tapestry' },
  { href: '/spaces/tree',        label: 'Family Tree', lineageOnly: true },
  { href: '/spaces/legacy-bank', label: 'Family Legacy Bank' },
  { href: '/spaces/manage',      label: 'Manage Space' },
];

/**
 * Every container in this phase is a Family Space, and a Family Space
 * always has lineage. When Circles ship this reads the container's
 * `has_lineage` — and Family Tree must then be ABSENT inside a Circle,
 * not present and empty.
 */
const ACTIVE_CONTAINER_HAS_LINEAGE = true;

// ─── Family space switcher ────────────────────────────────────────────

/** Row 2 only. Lists Family Spaces; never Homes. */
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

// ─── Avatar ───────────────────────────────────────────────────────────

function Avatar({ user }: { user: AuthUser }) {
  const name = user.display_name?.trim() || user.name?.trim() || user.email;
  if (user.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="topnav__avatar" src={user.avatar_url} alt={name} />;
  }
  return (
    <span className="topnav__avatar topnav__avatar--initial" role="img" aria-label={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// ─── AppNav ───────────────────────────────────────────────────────────

export default function AppNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const feedback = useFeedback();

  // Below 900px row 1 collapses into a drawer. Create and the avatar
  // stay in the bar, as the design requires.
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const inSpaces = pathname === '/spaces' || pathname.startsWith('/spaces/');

  const isActive = (l: NavLink) => {
    const base = l.match ?? l.href;
    if (l.exact) return pathname === base;
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  // Navigating is the most common way out of the drawer.
  useEffect(() => { setDrawer(false); setMenu(false); }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menu]);

  // Escape to dismiss, and keep Tab inside the drawer while it covers
  // the page.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawer(false);
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
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [drawer]);

  // Move focus into the drawer on open, hand it back to the trigger on
  // close. `wasOpen` keeps this from stealing focus on first mount. The
  // rAF matters: this effect runs before style is recomputed, so the
  // drawer is still `visibility: hidden` and focus() would be refused.
  useEffect(() => {
    const target = drawer ? closeRef.current : wasOpen.current ? triggerRef.current : null;
    wasOpen.current = drawer;
    if (!target) return;
    const frame = requestAnimationFrame(() => target.focus());
    return () => cancelAnimationFrame(frame);
  }, [drawer]);

  // Rotating to a desktop width would otherwise leave the body scroll
  // locked with no visible way to close.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 901px)');
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setDrawer(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const handleSignOut = () => {
    logout();
    router.replace('/');
  };

  const spaceItems = SPACE_NAV.filter(l => !l.lineageOnly || ACTIVE_CONTAINER_HAS_LINEAGE);

  return (
    <>
      <header className="topnav">
        <div className="topnav__row">
          <button
            ref={triggerRef}
            type="button"
            className="topnav__menu-btn"
            aria-label="Open navigation"
            aria-expanded={drawer}
            aria-controls="app-drawer"
            onClick={() => setDrawer(true)}
          >
            <MenuIcon />
          </button>

          <Link href="/home" className="topnav__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-kinloom.png" alt="Kinloom" />
          </Link>

          <nav className="topnav__links" aria-label="Primary">
            {HOME_NAV.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`topnav__link${isActive(l) ? ' is-active' : ''}`}
                aria-current={isActive(l) ? 'page' : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="topnav__right">
            <Link href="/create" className="topnav__create">Create a Kinloom</Link>
            <div className="topnav__account" ref={menuRef}>
              <button
                type="button"
                className="topnav__account-btn"
                aria-haspopup="menu"
                aria-expanded={menu}
                aria-label="Account"
                onClick={() => setMenu(o => !o)}
              >
                <Avatar user={user} />
              </button>

              {menu && (
                <div className="topnav__menu" role="menu">
                  <div className="topnav__menu-head">
                    <p className="topnav__menu-name">
                      {user.display_name?.trim() || user.name?.trim() || 'Your account'}
                    </p>
                    <p className="topnav__menu-email">{user.email}</p>
                  </div>
                  {ACCOUNT_NAV.map(l => (
                    <Link
                      key={l.href}
                      href={l.href}
                      role="menuitem"
                      className={`topnav__menu-item${isActive(l) ? ' is-active' : ''}`}
                      aria-current={isActive(l) ? 'page' : undefined}
                    >
                      {l.label}
                    </Link>
                  ))}

                  <div className="topnav__menu-rule" role="separator" />

                  <Link href="/settings" role="menuitem" className="topnav__menu-item">Settings</Link>
                  <Link href="/help" role="menuitem" className="topnav__menu-item">Help</Link>
                  {feedback.enabled && (
                    <div className="topnav__menu-item topnav__menu-item--feedback">
                      <FeedbackNavItem onOpen={feedback.openSheet} />
                    </div>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    className="topnav__menu-item topnav__menu-item--signout"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {inSpaces && (
          <div className="topnav__row topnav__row--scope">
            <FamilySpaceSwitcher />
            <nav className="topnav__links topnav__links--scope" aria-label="Family space">
              {spaceItems.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`topnav__link${isActive(l) ? ' is-active' : ''}`}
                  aria-current={isActive(l) ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <div
        className={`app-drawer__backdrop${drawer ? ' is-open' : ''}`}
        aria-hidden="true"
        onClick={() => setDrawer(false)}
      />

      <div id="app-drawer" ref={navRef} className={`app-drawer${drawer ? ' is-open' : ''}`}>
        <div className="app-drawer__head">
          <Link href="/home" className="app-drawer__logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-kinloom.png" alt="Kinloom" />
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="app-drawer__close"
            aria-label="Close navigation"
            onClick={() => setDrawer(false)}
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="app-drawer__nav" aria-label="Primary">
          {HOME_NAV.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`app-drawer__link${isActive(l) ? ' is-active' : ''}`}
            >
              {l.label}
            </Link>
          ))}

          {inSpaces && (
            <>
              <div className="app-drawer__rule" />
              <div className="app-drawer__scope">
                <FamilySpaceSwitcher />
              </div>
              {spaceItems.map(l => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`app-drawer__link app-drawer__link--sub${isActive(l) ? ' is-active' : ''}`}
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>
    </>
  );
}
