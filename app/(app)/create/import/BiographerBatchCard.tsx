'use client';

/**
 * BiographerBatchCard — rendered when the Biographer calls split_into_multiple.
 *
 * Shows the proposed kinlooms with a "Keep refining" escape and a primary
 * "Publish" action. Publish loops the single-create endpoint server-side
 * (POST /api/agent/biographer/publish) once per draft and reports a per-item
 * result. Because that loop is NOT transactional, a mid-batch failure leaves
 * some kinlooms created: the card marks each item done/failed and lets the
 * user retry ONLY the failures, so a success is never re-created (no dupes).
 * On full success it locks and hands off to the Library via onAllPublished.
 */

import { useState } from 'react';

export type ProposedKinloom = {
  working_title: string;
  one_line_summary: string;
  /** Full content extracted from the source — what actually gets saved. */
  body: string;
  suggested_type_slug: string;
};

export type BatchInput = {
  proposed_kinlooms: ProposedKinloom[];
  reasoning?: string;
};

type ItemStatus = 'idle' | 'publishing' | 'done' | 'error';

type PublishResult = { ok: boolean; ulid?: string; title: string; error?: string };

type Props = {
  toolUseId: string;
  input: BatchInput;
  onKeepRefining: (toolUseId: string) => void;
  /** Called once every proposed kinloom has been created. */
  onAllPublished: () => void;
};

export function BiographerBatchCard({ input, toolUseId, onKeepRefining, onAllPublished }: Props) {
  const kinlooms = input.proposed_kinlooms;

  const [statuses, setStatuses] = useState<ItemStatus[]>(() => kinlooms.map(() => 'idle'));
  const [errors, setErrors] = useState<Array<string | null>>(() => kinlooms.map(() => null));
  const [publishing, setPublishing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const allPublished = statuses.length > 0 && statuses.every(s => s === 'done');
  const failedCount = statuses.filter(s => s === 'error').length;
  const hasAttempted = statuses.some(s => s !== 'idle');

  const handlePublish = async () => {
    if (publishing || allPublished) return;

    // Only publish items not already created — a done item is never resent.
    const targets = kinlooms.map((_, i) => i).filter(i => statuses[i] !== 'done');
    if (targets.length === 0) return;

    setPublishing(true);
    setBanner(null);
    setStatuses(prev => prev.map((s, i) => (targets.includes(i) ? 'publishing' : s)));
    setErrors(prev => prev.map((e, i) => (targets.includes(i) ? null : e)));

    // Publish one draft per request, sequentially, resolving each item as it
    // lands. This keeps every request short (a big batch can't outrun a
    // platform timeout), surfaces live per-item progress instead of one long
    // silent wait, and records each success immediately — so a retry only
    // re-sends the items that genuinely failed, never re-creating a saved one.
    let failed = 0;

    for (const idx of targets) {
      try {
        const res = await fetch('/api/agent/biographer/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drafts: [{
              title: kinlooms[idx].working_title,
              type_slug: kinlooms[idx].suggested_type_slug,
              body: kinlooms[idx].body,
            }],
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `Publish failed (${res.status})`);
        }
        const data = (await res.json()) as { results: PublishResult[] };
        const r = data.results?.[0];

        if (r?.ok) {
          setStatuses(prev => prev.map((s, i) => (i === idx ? 'done' : s)));
          setErrors(prev => prev.map((e, i) => (i === idx ? null : e)));
        } else {
          failed++;
          const message = r?.error ?? 'Could not save this kinloom.';
          setStatuses(prev => prev.map((s, i) => (i === idx ? 'error' : s)));
          setErrors(prev => prev.map((e, i) => (i === idx ? message : e)));
        }
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : 'Could not save this kinloom.';
        setStatuses(prev => prev.map((s, i) => (i === idx ? 'error' : s)));
        setErrors(prev => prev.map((e, i) => (i === idx ? message : e)));
      }
    }

    setPublishing(false);

    // targets were every not-yet-done item, so zero failures this pass means
    // everything is now saved.
    if (failed === 0) {
      onAllPublished();
    } else {
      setBanner(`${failed} kinloom${failed === 1 ? '' : 's'} couldn’t be saved. The rest were published — you can retry just the failures.`);
    }
  };

  const doneCount = statuses.filter(s => s === 'done').length;
  const publishLabel = publishing
    ? `Saving… (${doneCount}/${kinlooms.length})`
    : allPublished
      ? 'Published'
      : failedCount > 0
        ? `Retry ${failedCount} failed`
        : `Publish ${kinlooms.length} to your library`;

  const publishDisabled = publishing || allPublished;

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--card)',
        padding: '32px 36px',
        marginBottom: 48,
        opacity: allPublished ? 0.85 : 1,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-4)',
          margin: '0 0 8px',
        }}
      >
        {kinlooms.length} kinloom{kinlooms.length === 1 ? '' : 's'} found
      </p>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--fg-3)',
          margin: '0 0 24px',
        }}
      >
        {allPublished
          ? 'All saved to your library.'
          : 'The Biographer found these in the document. Publish them to your library, or keep refining.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {kinlooms.map((k, i) => {
          const status = statuses[i];
          return (
            <div
              key={i}
              style={{
                background: 'var(--background)',
                border: `1px solid ${status === 'error' ? 'var(--destructive)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '16px 20px',
                opacity: status === 'done' ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 17,
                    fontWeight: 400,
                    color: 'var(--fg-1)',
                    lineHeight: 1.3,
                    margin: '0 0 4px',
                  }}
                >
                  {k.working_title}
                </p>
                <StatusPill status={status} />
              </div>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: 'var(--fg-3)',
                  margin: '0 0 6px',
                }}
              >
                {k.one_line_summary}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--fg-4)',
                  margin: 0,
                  textTransform: 'capitalize',
                }}
              >
                {k.suggested_type_slug.replace('-', '‑')}
              </p>
              {status === 'error' && errors[i] && (
                <p style={{ fontSize: 12, color: 'var(--destructive)', margin: '8px 0 0', lineHeight: 1.5 }}>
                  {errors[i]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {banner && (
        <p style={{ fontSize: 13, color: 'var(--destructive)', margin: '0 0 16px', lineHeight: 1.55 }}>
          {banner}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={handlePublish}
          disabled={publishDisabled}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: publishDisabled ? 'not-allowed' : 'pointer',
            opacity: publishDisabled ? 0.6 : 1,
          }}
        >
          {publishLabel}
        </button>
        {!allPublished && (
          <button
            onClick={() => onKeepRefining(toolUseId)}
            disabled={publishing}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--fg-2)',
              cursor: publishing ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              opacity: publishing ? 0.6 : 1,
            }}
          >
            Keep refining
          </button>
        )}
        {hasAttempted && !allPublished && (
          <span style={{ fontSize: 12, color: 'var(--fg-4)' }}>
            {doneCount}/{kinlooms.length} saved
          </span>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ItemStatus }) {
  if (status === 'done') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
        Saved
      </span>
    );
  }
  if (status === 'publishing') {
    return (
      <span style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0 }}>Saving…</span>
    );
  }
  if (status === 'error') {
    return (
      <span style={{ fontSize: 11, color: 'var(--destructive)', flexShrink: 0 }}>Failed</span>
    );
  }
  return null;
}
