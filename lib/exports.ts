/**
 * Family-space exports (PDF / JSON archive of all kinlooms).
 *
 *   1. createExport(...)  → 202 with { export_id, status: 'pending' }
 *   2. poll getExport(...) until status === 'ready' (or 'failed')
 *   3. download via the proxied /api/proxy/.../exports/{id}/download
 *      using `exportDownloadUrl(...)`. We force a same-origin link so
 *      the kinloom_id_token cookie is attached.
 */

import { apiFetch, API_BASE } from './api';

export type ExportFormat = 'pdf' | 'json';
export type ExportSchedule = 'once' | 'monthly';

export type ExportStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
  | (string & {});

export type CreateExportPayload = {
  format: ExportFormat;
  schedule?: ExportSchedule | null;
};

export type CreateExportResponse = {
  export_id: string;
  status: ExportStatus;
};

export type Export = {
  ulid: string;
  status: ExportStatus;
  format: string;
  completed_at: string;
  download_url: string | null;
  error_message: string | null;
};

/** POST /family-spaces/{familySpace}/exports */
export async function createExport(
  familySpaceId: string,
  payload: CreateExportPayload,
): Promise<CreateExportResponse> {
  return apiFetch<CreateExportResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/exports`,
    { method: 'POST', body: payload },
  );
}

/** GET /family-spaces/{familySpace}/exports/{export} — status polling. */
export async function getExport(
  familySpaceId: string,
  exportId: string,
): Promise<Export> {
  return apiFetch<Export>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/exports/${encodeURIComponent(exportId)}`,
  );
}

/**
 * Same-origin URL the browser can navigate to for the actual file. Goes
 * through the BFF so the Bearer cookie is attached.
 */
export function exportDownloadUrl(familySpaceId: string, exportId: string): string {
  return `${API_BASE}/family-spaces/${encodeURIComponent(familySpaceId)}/exports/${encodeURIComponent(exportId)}/download`;
}
