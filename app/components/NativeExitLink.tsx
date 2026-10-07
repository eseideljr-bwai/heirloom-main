'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { postToNative, type NativeMessage } from '../../lib/embed';

type Props = ComponentProps<typeof Link> & {
  /** Sent to the iOS app instead of navigating, when the app is listening. */
  message: NativeMessage;
};

/**
 * A link out of the creation flow. Inside the iOS WebView it hands the
 * exit to the native app; Next.js client navigations never reach the
 * native navigation guard, so the page has to say it is leaving.
 */
export default function NativeExitLink({ message, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={e => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (postToNative(message)) e.preventDefault();
      }}
    />
  );
}
