/**
 * Feature flag and build-time configuration for the feedback tool.
 *
 * The flag is OFF unless NEXT_PUBLIC_FEEDBACK_TOOL is exactly '1'. Every
 * entry point checks it, so an environment that doesn't set it renders no
 * trigger, mounts no listener, and has no way to reach the sheet.
 *
 * Next only inlines `process.env.NEXT_PUBLIC_*` when it is read via literal
 * dot-notation with a literal key — bracket access silently yields undefined.
 * See the same note in lib/firebase-client.ts. Hence the module-level consts.
 */

import type { FeedbackEnvironment } from './types';

const FLAG = process.env.NEXT_PUBLIC_FEEDBACK_TOOL;
const ENV = process.env.NEXT_PUBLIC_KINLOOM_ENV;
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/** Off by default. Only the literal '1' turns it on. */
export const FEEDBACK_ENABLED = FLAG === '1';

/**
 * The dev-only state switcher is gated on BOTH the flag and a dev build, so
 * it can never appear in a deployed environment even if the flag is on there.
 */
export const FEEDBACK_DEV_TOOLS =
  FEEDBACK_ENABLED && process.env.NODE_ENV !== 'production';

/**
 * Which entry-point treatment ships. Both variants are built; this picks the
 * default. The dev switcher overrides it at runtime for comparison.
 *
 * 'visible' — a filled sage pill. Findable during beta.
 * 'quiet'   — an outlined neutral pill. Low visual weight, full contrast.
 */
export type EntryVariant = 'visible' | 'quiet';
export const DEFAULT_ENTRY_VARIANT: EntryVariant = 'visible';

/**
 * There is no client-visible build version today — package.json isn't
 * exposed and the deploy workflow writes no version or SHA. Until one is
 * added this is null on every report, which is why the field is nullable.
 */
export const APP_VERSION_OR_NULL: string | null = APP_VERSION ?? null;

/**
 * Nothing today distinguishes dev / preview / prod on the client. If an
 * explicit NEXT_PUBLIC_KINLOOM_ENV is set we trust it; otherwise we can only
 * tell a dev build from a production build, and 'preview' is unreachable.
 */
export function resolveEnvironment(): FeedbackEnvironment {
  if (ENV === 'dev' || ENV === 'preview' || ENV === 'prod') return ENV;
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}
