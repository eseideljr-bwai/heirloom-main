/**
 * A passive ring buffer of the last few client errors.
 *
 * PASSIVE IS THE WHOLE POINT. This must not swallow errors, must not change
 * how anything else handles them, and must not log anything itself:
 *
 *   • The window listeners never call preventDefault(), so default reporting
 *     and any other listener still run.
 *   • The console.error wrapper always calls the original first, with the
 *     original arguments. If our own bookkeeping throws it is swallowed here
 *     rather than allowed to escape into someone else's error path.
 *   • Nothing in this file writes to the console.
 *
 * The wrapper exists because the app's error boundaries report exclusively
 * through console.error (app/global-error.tsx, app/error.tsx, app/(app)/
 * error.tsx) — window listeners alone would miss every one of them.
 */

const CAPACITY = 5;

/** Errors can carry story text. Keep an identifiable prefix, not an essay. */
const MAX_ENTRY_LENGTH = 300;

let buffer: string[] = [];
let installed = false;
let restore: (() => void) | null = null;

function record(entry: string): void {
  const trimmed = entry.trim();
  if (!trimmed) return;
  const clipped =
    trimmed.length > MAX_ENTRY_LENGTH
      ? `${trimmed.slice(0, MAX_ENTRY_LENGTH)}…`
      : trimmed;
  buffer.push(clipped);
  if (buffer.length > CAPACITY) buffer = buffer.slice(-CAPACITY);
}

function describe(value: unknown): string {
  if (value instanceof Error) {
    return value.message ? `${value.name}: ${value.message}` : value.name;
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Starts collecting. Safe to call more than once; returns the uninstaller.
 * Callers should treat the return value as the only way to stop.
 */
export function installErrorBuffer(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (installed) return () => {};
  installed = true;

  const onError = (event: ErrorEvent) => {
    try {
      record(event.message || describe(event.error));
    } catch {
      // Never let capture interfere with the page's own error handling.
    }
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    try {
      record(`Unhandled rejection: ${describe(event.reason)}`);
    } catch {
      // As above.
    }
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const originalConsoleError = console.error;
  const wrapped: typeof console.error = (...args: unknown[]) => {
    // Call through FIRST and unconditionally — devtools, and anything else
    // wrapping console.error, must see this exactly as they would have.
    originalConsoleError.apply(console, args as []);
    try {
      record(args.map(describe).join(' '));
    } catch {
      // As above.
    }
  };
  console.error = wrapped;

  restore = () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    // Only hand console.error back if nobody wrapped it after us; clobbering
    // a later wrapper would be exactly the interference this file avoids.
    if (console.error === wrapped) console.error = originalConsoleError;
    installed = false;
    restore = null;
  };

  return restore;
}

export function uninstallErrorBuffer(): void {
  restore?.();
}

/** A copy of the buffer, oldest first. Null when nothing has been seen. */
export function readErrorBuffer(): string[] | null {
  return buffer.length > 0 ? [...buffer] : null;
}
