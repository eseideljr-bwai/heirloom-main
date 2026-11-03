'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../../lib/api';
import {
  exportDownloadUrl,
  formatBytes,
  getExport,
  recallExport,
  rememberExport,
  startExport,
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
    alive.current = true;
    const remembered = recallExport();
    if (remembered) watch(remembered.id);
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [watch]);

  async function begin(format: ExportFormat) {
    setStarting(format);
    setError(null);
    setGaveUp(false);
    try {
      const ex = await startExport(format);
      rememberExport({ id: ex.id, format: ex.format });
      setJob(ex);
      if (ex.status === 'ready' || ex.status === 'failed' || ex.status === 'expired') stop();
      else watch(ex.id);
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
      <h1 className="settings-h1">Export &amp; backup</h1>
      <p className="settings-card-text">
        Your kinlooms belong to you. Download a copy of everything you’ve written, drafts and private
        kinlooms included, any time.
      </p>

      <div className="settings-stack">
        <div className="card">
          <h2 className="settings-h2">Download your kinlooms</h2>

          <div className="export-choices">
            {FORMATS.map(f => (
              <div key={f.format} className="export-choice">
                <div className="export-choice__body">
                  <p className="notif-row__label">{f.title}</p>
                  <p className="notif-row__desc">{f.text}</p>
                </div>
                <button
                  type="button"
                  className={f.primary ? 'btn-save' : 'btn-outline'}
                  onClick={() => begin(f.format)}
                  disabled={busy}
                >
                  {starting === f.format ? 'Starting…' : 'Export'}
                </button>
              </div>
            ))}
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
            </div>
          )}

          {finished && job?.status === 'failed' && (
            <div className="export-status export-status--error" role="alert">
              <p>
                <strong>The export didn’t finish.</strong>{' '}
                {job.error_message || 'Please start a new one in a few minutes.'}
              </p>
            </div>
          )}

          {finished && job?.status === 'expired' && (
            <div className="export-status" role="status">
              <p>Your last export has expired, as downloads last seven days. Start a new one above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
