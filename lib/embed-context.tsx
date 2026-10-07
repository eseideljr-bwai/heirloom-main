'use client';

import { createContext, useContext } from 'react';

const EmbedContext = createContext(false);

/**
 * Carries the server's embed decision to client components. Read from
 * context rather than `document.cookie` so the first client render
 * matches the server's and hydration doesn't flip the shell.
 */
export function EmbedProvider({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return <EmbedContext.Provider value={embedded}>{children}</EmbedContext.Provider>;
}

/** True when this page is rendered inside the iOS app's WebView. */
export function useEmbedded(): boolean {
  return useContext(EmbedContext);
}
