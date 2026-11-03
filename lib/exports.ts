/**
 * Personal exports: everything the signed-in user created, across every
 * family space they belong to. `json` produces a ZIP archive with media,
 * `pdf` a printable book of their kinlooms. The family space in the URL is
 * only the route the request goes through.
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

export type CreateExportPayload = {
  format: ExportFormat;
  schedule?: ExportSchedule | null;
};

export type CreateExportResponse = {
  export_id: string;
  status: ExportStatus;
};

export type ExportCounts = Record<string, number>;

export type Export = {
  ulid: string;
  status: ExportStatus;
  format: string;
  completed_at: string | null;
  download_url: string | null;
  error_message: string | null;
  file_name?: string | null;
  file_size?: number | null;
  expires_at?: string | null;
  counts?: ExportCounts | null;
};

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
