/**
 * Route → feature map. The only source of the paths and titles analytics
 * may see.
 *
 * Every App Router route maps to a stable, content-free feature path and a
 * generic name. Dynamic segments (kinloom ids, person ids, conversation
 * ids, invitation tokens) never pass through: they collapse to the feature
 * they belong to. Query strings are never part of the result. Anything not
 * listed maps to `/other`, never to the raw path.
 *
 * Used for:
 *   - the page <title> (root layout generateMetadata + the client backstop),
 *   - HubSpot `setPath`,
 *   - the sanitized `kl_page_path` / `kl_page_title` in the data layer, which
 *     the GA4 Google tag reads for page_location / page_title.
 *
 * Legacy Bank: every Legacy Bank screen is `/legacy-bank` — the visit only,
 * never which person, conversation, question or answer.
 */

export type Feature = {
  /** Content-free path, e.g. `/kinloom`. Always starts with `/`. */
  path: string;
  /** Generic, human name for the title, e.g. `Library`. */
  name: string;
};

type Rule = {
  /** Path segments; `*` matches exactly one segment, `**` matches one or more. */
  pattern: string;
  feature: Feature;
};

const f = (path: string, name: string): Feature => ({ path, name });

const LEGACY_BANK = f('/legacy-bank', 'Legacy Bank');
const INVITE = f('/invite', 'Invitation');
const SIGN_IN = f('/sign-in', 'Sign in');

// Order matters only where patterns overlap: exact routes first.
const RULES: Rule[] = [
  // ── Public / entry ────────────────────────────────────────────
  { pattern: '/', feature: SIGN_IN },
  { pattern: '/login', feature: SIGN_IN },
  { pattern: '/signup', feature: f('/signup', 'Create your account') },
  { pattern: '/forgot-password', feature: f('/forgot-password', 'Reset your password') },
  // Firebase email actions (reset password, verify email, recover email). The
  // oobCode lives in the query, which never reaches analytics.
  { pattern: '/auth/action', feature: f('/account-action', 'Account') },
  { pattern: '/invite', feature: INVITE },
  { pattern: '/invite/*', feature: INVITE },
  { pattern: '/verify-email', feature: f('/verify-email', 'Verify your email') },
  { pattern: '/consent', feature: f('/consent', 'Before you continue') },

  // ── Onboarding ────────────────────────────────────────────────
  { pattern: '/onboarding', feature: f('/onboarding', 'Welcome') },
  { pattern: '/onboarding/profile', feature: f('/onboarding/profile', 'Welcome') },
  { pattern: '/onboarding/photo', feature: f('/onboarding/photo', 'Welcome') },
  { pattern: '/onboarding/first-kinloom', feature: f('/onboarding', 'Welcome') },

  // ── Home ──────────────────────────────────────────────────────
  { pattern: '/home', feature: f('/home', 'Home') },
  { pattern: '/home/manage', feature: f('/home/manage', 'Manage Home') },
  { pattern: '/home/manage/featured', feature: f('/home/manage/featured', 'Featured on Home') },

  // ── Create ────────────────────────────────────────────────────
  { pattern: '/create', feature: f('/create', 'Create') },
  { pattern: '/create/import', feature: f('/create/biographer', 'Biographer') },
  { pattern: '/create/talk', feature: f('/create/talk', 'Talk') },
  { pattern: '/create/publish', feature: f('/create/publish', 'Publish') },
  // The kinloom type slug: collapsed, so an unexpected slug can't leak.
  { pattern: '/create/*', feature: f('/create/write', 'Write') },

  // ── Library / Vault / kinlooms ────────────────────────────────
  { pattern: '/library', feature: f('/library', 'Library') },
  { pattern: '/library/*', feature: f('/kinloom', 'Kinloom') },
  { pattern: '/vault', feature: f('/vault', 'Vault') },

  // ── Legacy Bank (visit only) ──────────────────────────────────
  { pattern: '/legacy-bank', feature: LEGACY_BANK },
  { pattern: '/legacy-bank/**', feature: LEGACY_BANK },
  { pattern: '/spaces/legacy-bank', feature: LEGACY_BANK },

  // ── Legacy Portrait ───────────────────────────────────────────
  { pattern: '/portrait/**', feature: f('/portrait', 'Legacy Portrait') },

  // ── Family Space ──────────────────────────────────────────────
  { pattern: '/spaces', feature: f('/family-space', 'Family Space') },
  { pattern: '/spaces/tapestry', feature: f('/family-space/tapestry', 'Family Space') },
  { pattern: '/spaces/tree', feature: f('/family-space/tree', 'Family tree') },
  { pattern: '/spaces/manage', feature: f('/family-space/manage', 'Manage Family Space') },
  { pattern: '/spaces/manage/featured', feature: f('/family-space/manage/featured', 'Featured on Family Space') },
  { pattern: '/spaces/new', feature: f('/family-space/new', 'Create a Family Space') },

  // ── Settings / help ───────────────────────────────────────────
  { pattern: '/settings', feature: f('/settings', 'Settings') },
  { pattern: '/settings/export', feature: f('/settings/export', 'Export') },
  { pattern: '/settings/notifications', feature: f('/settings/notifications', 'Notifications') },
  { pattern: '/settings/privacy', feature: f('/settings/privacy', 'Privacy') },
  { pattern: '/help', feature: f('/help', 'Help') },
];

export const OTHER: Feature = f('/other', 'Kinloom');

function segments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function matches(pattern: string[], path: string[]): boolean {
  const last = pattern[pattern.length - 1];
  if (last === '**') {
    if (path.length < pattern.length) return false;
    return pattern.slice(0, -1).every((p, i) => p === '*' || p === path[i]);
  }
  if (pattern.length !== path.length) return false;
  return pattern.every((p, i) => p === '*' || p === path[i]);
}

const COMPILED = RULES.map(r => ({ seg: segments(r.pattern), feature: r.feature }));

/**
 * Feature for a pathname (or a full path with query/hash, which is ignored).
 * Never returns any part of the input.
 */
export function featureForPath(input: string | null | undefined): Feature {
  if (!input) return OTHER;
  let pathname = input;
  const cut = pathname.search(/[?#]/);
  if (cut >= 0) pathname = pathname.slice(0, cut);
  // Trailing slash and case are normalised; Next routes are lowercase.
  const seg = segments(pathname.toLowerCase());
  for (const rule of COMPILED) {
    if (matches(rule.seg, seg)) return rule.feature;
  }
  return OTHER;
}

/** The sign-in page keeps the product's own title; everything else is generic. */
export const DEFAULT_TITLE = 'Kinloom — Preserve Your Family Legacy';

export function titleForFeature(feature: Feature): string {
  if (feature === SIGN_IN) return DEFAULT_TITLE;
  if (feature === OTHER) return 'Kinloom';
  return `Kinloom · ${feature.name}`;
}

export function titleForPath(input: string | null | undefined): string {
  return titleForFeature(featureForPath(input));
}
