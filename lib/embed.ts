/**
 * iOS WebView embedding (SOW D1 shell-less mode, D2 bridge emitter).
 *
 * The iOS app hosts the Talk and Biographer creation flows in a
 * WKWebView. It opens them with `?embed=ios` (or an
 * `X-Kinloom-Client: ios` header on the first navigation); middleware
 * turns that into the `kinloom_embed` cookie so client-side navigations
 * inside the flow stay embedded. `?embed=off` clears it.
 *
 * Bridge contract, version 1. The web posts one object per event to
 * `window.webkit.messageHandlers.kinloom`:
 *
 *   { version: 1, type: 'publishComplete', kinloomIds: string[] }
 *       The flow published and is finished. Native dismisses the
 *       WebView and refreshes the Vault and every room. For a sectioned
 *       Biographer import, `kinloomIds` holds the last section only;
 *       earlier sections were saved as the user went.
 *   { version: 1, type: 'cancel' }
 *       The user backed out of the flow. Nothing new was published.
 *   { version: 1, type: 'requestClose' }
 *       The flow tried to leave for a screen the WebView doesn't host
 *       (onboarding, for one). Native closes and routes natively.
 *   { version: 1, type: 'sessionExpired' }
 *       A request came back 401 or the session vanished. Native
 *       re-bootstraps via POST /api/auth/mobile-session and reloads
 *       once; a second failure is a native error.
 *
 * Every exit point falls back to its normal web navigation when no
 * handler is installed, so the same pages keep working in a browser.
 */

export const EMBED_COOKIE = 'kinloom_embed';
/** Set by middleware on the forwarded request so server components can read it. */
export const EMBED_REQUEST_HEADER = 'x-kinloom-embed';
export const EMBED_CLIENT_HEADER = 'x-kinloom-client';
export const EMBED_IOS = 'ios';

export const BRIDGE_VERSION = 1;

export type NativeMessage =
  | { type: 'publishComplete'; kinloomIds: string[] }
  | { type: 'cancel' }
  | { type: 'requestClose' }
  | { type: 'sessionExpired' };

type WebkitWindow = Window & {
  webkit?: {
    messageHandlers?: {
      kinloom?: { postMessage: (message: unknown) => void };
    };
  };
};

/**
 * Post to the iOS shell. Returns true only when a native handler took
 * the message, so callers can skip their web navigation exactly then.
 */
export function postToNative(message: NativeMessage): boolean {
  if (typeof window === 'undefined') return false;
  const handler = (window as WebkitWindow).webkit?.messageHandlers?.kinloom;
  if (!handler) return false;
  try {
    handler.postMessage({ version: BRIDGE_VERSION, ...message });
    return true;
  } catch {
    return false;
  }
}

/** Report a 401 to the iOS shell. A no-op in a browser. */
export function reportUnauthorized(status: number): void {
  if (status === 401) postToNative({ type: 'sessionExpired' });
}
