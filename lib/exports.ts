/**
 * Vault exports (contract §9.1): everything you've written, as a ZIP or a PDF.
 *
 *   1. startExport(format)  → 202 with the export (a double click returns the running one)
 *   2. pollExport(id)       → until `status` is `ready` or `failed`
 *   3. exportDownloadUrl(id) → navigate to it; the API redirects to a signed file URL
 *
 * There is no list of exports, so the id is kept in this browser to resume a
 * job after a reload. Only 2 exports an hour are allowed.
 */

import { kinloomApi } from './kinloom-api';
import { API_BASE } from './api';
import type { components } from './api-schema/typed';

export type VaultExport = components['schemas']['VaultExport'];
export type ExportFormat = VaultExport['format'];

export function startExport(format: ExportFormat): Promise<VaultExport> {
  return kinloomApi.post('/vault/exports', { body: { format } });
}

export function getExport(id: string): Promise<VaultExport> {
  return kinloomApi.get('/vault/exports/{export}', { path: { export: id } });
}

/** Same-origin, so the session reaches the API; the API answers 302 to the file. */
export function exportDownloadUrl(id: string): string {
  return `${API_BASE}/vault/exports/${encodeURIComponent(id)}/download`;
}

const KEY = 'kinloom-vault-export-v1';
type Remembered = { id: string; format: ExportFormat };

export function rememberExport(job: Remembered | null): void {
  try {
    if (job) window.localStorage.setItem(KEY, JSON.stringify(job));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* blocked storage: the export still works, it just can't be resumed */
  }
}

export function recallExport(): Remembered | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Remembered>;
    return v.id && (v.format === 'json' || v.format === 'pdf') ? { id: v.id, format: v.format } : null;
  } catch {
    return null;
  }
}

export function formatBytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
