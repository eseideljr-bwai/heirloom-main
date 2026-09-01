'use client';

/**
 * Owns the feedback tool's open/closed state and mounts its UI.
 *
 * Everything is gated on FEEDBACK_ENABLED. With the flag off this provider
 * renders its children and nothing else: no trigger, no sheet, no error
 * listener, no way in.
 *
 * Opening the sheet NEVER changes the route. The page behind it stays
 * mounted and untouched — that is the point of a sheet here, since the whole
 * value of the report is the state the user was already in.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_ENTRY_VARIANT,
  FEEDBACK_DEV_TOOLS,
  FEEDBACK_ENABLED,
  type EntryVariant,
} from '../../../lib/feedback/config';
import { installErrorBuffer } from '../../../lib/feedback/error-buffer';
import { collectMetadata } from '../../../lib/feedback/metadata';
import type { FeedbackMetadata } from '../../../lib/feedback/types';
import { FeedbackTrigger } from './FeedbackTrigger';
import { FeedbackSheet, type SheetView } from './FeedbackSheet';
import { FeedbackDevSwitcher } from './FeedbackDevSwitcher';

type FeedbackContextValue = {
  enabled: boolean;
  openSheet: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue>({
  enabled: false,
  openSheet: () => {},
});

/** Lets app chrome (the nav item) open the sheet without importing its guts. */
export function useFeedback(): FeedbackContextValue {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [metadata, setMetadata] = useState<FeedbackMetadata | null>(null);
  const [variant, setVariant] = useState<EntryVariant>(DEFAULT_ENTRY_VARIANT);
  const [forcedView, setForcedView] = useState<SheetView | null>(null);

  // Whatever had focus when the sheet opened — the floating trigger, the nav
  // item, or anything else. Focus goes back there on close.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Start collecting client errors as soon as the app chrome mounts, so the
  // buffer already has history by the time someone opens the sheet.
  useEffect(() => {
    if (!FEEDBACK_ENABLED) return;
    return installErrorBuffer();
  }, []);

  const openSheet = useCallback(() => {
    if (!FEEDBACK_ENABLED) return;
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement ? active : null;
    // Snapshot now — this is the moment the user is describing.
    setMetadata(collectMetadata(pathname));
    setOpen(true);
  }, [pathname]);

  const closeSheet = useCallback(() => {
    setOpen(false);
    setForcedView(null);
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected) target.focus();
  }, []);

  const value = useMemo<FeedbackContextValue>(
    () => ({ enabled: FEEDBACK_ENABLED, openSheet }),
    [openSheet],
  );

  if (!FEEDBACK_ENABLED) return <>{children}</>;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackTrigger variant={variant} onOpen={openSheet} expanded={open} />
      {open && metadata && (
        // Keyed on the forced view so the dev switcher genuinely resets the
        // sheet rather than changing a prop the sheet only reads on mount.
        <FeedbackSheet
          key={forcedView ?? 'default'}
          metadata={metadata}
          initialView={forcedView ?? 'composer'}
          onClose={closeSheet}
        />
      )}
      {FEEDBACK_DEV_TOOLS && (
        <FeedbackDevSwitcher
          variant={variant}
          onVariantChange={setVariant}
          onForceView={view => {
            setForcedView(view);
            if (!open) openSheet();
          }}
        />
      )}
    </FeedbackContext.Provider>
  );
}
