import 'server-only';
import { headers } from 'next/headers';
import { EMBED_IOS, EMBED_REQUEST_HEADER } from '../embed';

/**
 * True when middleware marked this request as coming from the iOS
 * WebView. Presentation only: it hides the web chrome and hands
 * session ownership to the native app. It is never an access check.
 */
export function isEmbeddedRequest(): boolean {
  return headers().get(EMBED_REQUEST_HEADER) === EMBED_IOS;
}
