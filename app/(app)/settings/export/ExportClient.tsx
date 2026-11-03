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
  type VaultExport,
} from '../../../../lib/exports';

const POLL_MS = 2500;
/** After this many polls (~10 minutes) we stop watching; the id is kept, so coming back resumes. */
const MAX_POLLS = 240;

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
      if (err instanceof ApiError && err.status === 429) {
        const wait = err.retryAfterSeconds;
        setError(
          wait
            ? `You can start two exports an hour. Try again in ${Math.max(1, Math.ceil(wait / 60))} minutes.`
            : 'You can start two exports an hour. Try again a little later.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not start the export.');
      }
    } finally {
      setStarting(null);
    }
  }

  const running = !!job && (job.status === 'pending' || job.status === 'processing');
  const busy = starting !== null || running;
  const finished = !!job && !running;

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

          {error && <p className="export-status export-status--error" role="alert">{error}</p>}

          {running && job && (
            <div className="export-status" role="status" aria-live="polite">
              <p>
                <strong>Preparing your {formatLabel(job.format)}…</strong>{' '}
                {job.format === 'json'
                  ? 'With photos and recordings this can take a few minutes.'
                  : 'This usually takes a moment.'}{' '}
                You can leave this page: it keeps working, and your download will be here when you
                come back.
              </p>
            </div>
          )}

          {gaveUp && job && (
            <div className="export-status" role="status">
              <p>
                Still working on it. Come back to this page in a little while, and your download will be
                here.
              </p>
            </div>
          )}

          {finished && job?.status === 'ready' && (
            <div className="export-status export-status--ready" role="status" aria-live="polite">
              <p>
                <strong>Your {formatLabel(job.format)} is ready.</strong>
                {job.file_size != null && <> {formatBytes(job.file_size)}.</>}
                {job.counts && (
                  <> {job.counts.kinlooms} {job.counts.kinlooms === 1 ? 'kinloom' : 'kinlooms'}
                    {job.counts.drafts > 0 && <>, {job.counts.drafts} {job.counts.drafts === 1 ? 'draft' : 'drafts'}</>}.</>
                )}
                {job.expires_at && <> Available until {untilText(job.expires_at)}.</>}
              </p>
              <p>
                <a className="btn-save export-status__download" href={exportDownloadUrl(job.id)} download={job.file_name ?? undefined}>
                  Download{job.file_name ? ` ${job.file_name}` : ''}
                </a>
              </p>
              {job.counts && job.counts.missing_files > 0 && (
                <p className="export-status__fine">
                  {job.counts.missing_files} {job.counts.missing_files === 1 ? 'file' : 'files'} couldn’t be
                  read from storage and {job.counts.missing_files === 1 ? 'is' : 'are'} listed in the archive’s
                  manifest.
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

        <div className="privacy-note">
          <p>
            An export holds only what you wrote, along with your settings and the people you named.
            Other people’s comments on your kinlooms are counted, never copied. Downloads are kept for
            seven days, and you can start two exports an hour.
          </p>
        </div>
      </div>
    </div>
  );
}
