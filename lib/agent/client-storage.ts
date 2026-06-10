import type { MessageParam } from './types';

const STORAGE_KEY = 'kinloom:talk:messages';

export function loadTalkSession(): MessageParam[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MessageParam[]) : [];
  } catch {
    return [];
  }
}

export function saveTalkSession(messages: MessageParam[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // sessionStorage may be full or unavailable — not fatal
  }
}

export function clearTalkSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
