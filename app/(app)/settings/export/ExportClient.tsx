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

const FORMATS: { format: ExportFormat; title: string; text: string; primary?: boolean }[] = [
  {
    format: 'json',
    title: 'Everything (ZIP)',
    text: 'Your kinlooms as a printable book, plus your data and every photo, recording and film.',
    primary: true,
  },
  {
    format: 'pdf',
    title: 'Just the book (PDF)',
    text: 'Your kinlooms as a printable book. No photos, recordings or films.',
  },
];

function formatLabel(format: ExportFormat) {
  return format === 'json' ? 'archive' : 'book';
}

function untilText(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

export default function ExportClient() {
  const [job, setJob] = useState<VaultExport | null>(null);
  const [starting, setStarting] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Poll one export until it settles. A reload resumes from the remembered id. */
  const watch = useCallback((id: string, polls = 0) => {
    setGaveUp(false);
    const tick = async () => {
      if (!alive.current) return;
      try {
        const ex = await getExport(id);
        if (!alive.current) return;
        setJob(ex);
        if (ex.status === 'ready' || ex.status === 'failed' || ex.status === 'expired') {
          stop();
          return;
        }
        if (polls + 1 >= MAX_POLLS) {
          stop();
          setGaveUp(true);
          return;
        }
        timer.current = setTimeout(() => watch(id, polls + 1), POLL_MS);
      } catch (err) {
        if (!alive.current) return;
        stop();
        if (err instanceof ApiError && err.status === 404) {
          // It was cleaned up (expired a while ago): forget it.
          rememberExport(null);
          setJob(null);
        } else {
          setError('We lost contact with your export. Reload the page to check on it.');
        }
      }
    };
    void tick();
  }, [stop]);

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

<<<<<<< HEAD
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
=======
  const running = !!job && (job.status === 'pending' || job.status === 'processing');
  const busy = starting !== null || running;
  const finished = !!job && !running;
>>>>>>> 6a93207d32d0d7a79549fcf5b506a44ac4105680

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
<<<<<<< HEAD
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
=======
>>>>>>> 6a93207d32d0d7a79549fcf5b506a44ac4105680
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
<<<<<<< HEAD
=======

        <div className="privacy-note">
          <p>
            An export holds only what you wrote, along with your settings and the people you named.
            Other people’s comments on your kinlooms are counted, never copied. Downloads are kept for
            seven days, and you can start two exports an hour.
          </p>
        </div>
>>>>>>> 6a93207d32d0d7a79549fcf5b506a44ac4105680
      </div>
    </div>
  );
}
