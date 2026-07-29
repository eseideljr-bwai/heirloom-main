/**
 * sessionStorage helpers for the Biographer import track.
 *
 * Two keys:
 *   DOCUMENT_KEY  — the extracted ExtractionResult (set once, cleared on handoff)
 *   MESSAGES_KEY  — the running conversation history (MessageParam[])
 *
 * Mirrors the pattern in lib/agent/client-storage.ts for the Talk track.
 */

import type { MessageParam } from '../agent/types';
import type { ExtractionResult } from './extract-document';

const DOCUMENT_KEY = 'kinloom:import:document';
const MESSAGES_KEY = 'kinloom:import:messages';

// ─── Document ─────────────────────────────────────────────────────────────────

export function loadImportDocument(): ExtractionResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DOCUMENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExtractionResult;
  } catch {
    return null;
  }
}

export function saveImportDocument(doc: ExtractionResult): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DOCUMENT_KEY, JSON.stringify(doc));
  } catch {
    // sessionStorage full or unavailable — not fatal
  }
}

export function clearImportDocument(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DOCUMENT_KEY);
  } catch {
    // ignore
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function loadImportMessages(): MessageParam[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MessageParam[]) : [];
  } catch {
    return [];
  }
}

export function saveImportMessages(messages: MessageParam[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function clearImportSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DOCUMENT_KEY);
    sessionStorage.removeItem(MESSAGES_KEY);
  } catch {
    // ignore
  }
}
