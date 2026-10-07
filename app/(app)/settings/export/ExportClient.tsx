'use client';

import { useEffect, useRef, useState } from 'react';
import { useActiveFamilySpace } from '../../../../lib/active-family-space';
import {
  createExport,
  getExport,
  exportDownloadUrl,
  type ExportFormat,
  type ExportStatus,
} from '../../../../lib/exports';
import { ApiError } from '../../../../lib/api';

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 60; // ~150s

type Job = {
  exportId: string;
  format: ExportFormat;
  status: ExportStatus;
  error?: string | null;
  /** Polling gave up before the job finished; the API emails a link instead. */
  timedOut?: boolean;
};

export default function ExportClient() {
  const { activeSpaceId } = useActiveFamilySpace();
  const [job, setJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function start(format: ExportFormat) {
    if (!activeSpaceId) return;
    setSubmitting(true);
    setJob({ exportId: '', format, status: 'pending' });
    try {
      const res = await createExport(activeSpaceId, { format, schedule: 'once' });
      setJob({ exportId: res.export_id, format, status: res.status });
      pollExport(activeSpaceId, res.export_id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not start the export.';
      setJob({ exportId: '', format, status: 'failed', error: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function pollExport(spaceId: string, exportId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    let polls = 0;
    pollRef.current = setInterval(async () => {
      polls += 1;
      try {
        const ex = await getExport(spaceId, exportId);
        const done = ex.status === 'ready' || ex.status === 'failed';
        const timedOut = !done && polls >= MAX_POLLS;
        setJob(prev => prev ? { ...prev, status: ex.status, error: ex.error_message, timedOut } : prev);
        if (done || timedOut) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err) {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        const msg = err instanceof ApiError ? err.message : 'Lost contact with the export job.';
        setJob(prev => prev ? { ...prev, status: 'failed', error: msg } : prev);
      }
    }, POLL_INTERVAL_MS);
  }

  const ready = job?.status === 'ready';
  const failed = job?.status === 'failed';
  // Once polling times out the buttons come back; clicking again returns the
  // same in-flight export from the API and resumes polling.
  const timedOut = !!job?.timedOut && !ready && !failed;
  const inFlight = !!job && !ready && !failed && !timedOut;

  return (
    <div>
      <h1 className="settings-h1">Export & backup</h1>
      <p className="settings-card-text">Your kinlooms belong to you. Export or download them at any time.</p>

      <div className="settings-stack">
        <div className="card">
          <h2 className="settings-h2">Export all kinlooms</h2>
          <p className="settings-card-text">
            Download all your kinlooms as a single archive. Includes full text and metadata.
          </p>
          <div className="vis-row">
            <button
              type="button"
              className="btn-save"
              onClick={() => start('pdf')}
              disabled={submitting || inFlight || !activeSpaceId}
            >
              Export as PDF
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => start('json')}
              disabled={submitting || inFlight || !activeSpaceId}
            >
              Export as JSON
            </button>
          </div>

          {job && (
            <div className={`export-status${failed ? ' export-status--error' : ''}`}>
              {inFlight && (
                <p>
                  Preparing your {job.format.toUpperCase()} export… this can take a moment for larger libraries.
                </p>
              )}
              {timedOut && (
                <p>
                  This is taking a while. We&apos;ll email you a download link when it&apos;s ready.
                </p>
              )}
              {ready && job.exportId && (
                <p>
                  <strong>Ready.</strong>{' '}
                  <a
                    href={exportDownloadUrl(activeSpaceId!, job.exportId)}
                    download
                  >
                    Download {job.format.toUpperCase()}
                  </a>
                </p>
              )}
              {failed && <p><strong>Export failed.</strong> {job.error || 'Please try again in a moment.'}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
