'use client';

/**
 * BiographerBatchCard — rendered when the Biographer calls split_into_multiple.
 *
 * Shows the proposed kinlooms with a "Keep refining" escape and a primary
 * "Publish" action. Each item can be edited inline (title, type, summary,
 * body) or dropped from the set before publishing — this is how "review one
 * at a time" works without leaving the import conversation. Editing is purely
 * client-side: the edited values are what get sent at publish time. Dropped
 * items are never published and don't count toward the batch.
 *
 * Publish loops the single-create endpoint server-side (POST
 * /api/agent/biographer/publish) once per KEPT draft and reports a per-item
 * result. Because that loop is NOT transactional, a mid-batch failure leaves
 * some kinlooms created: the card marks each item done/failed and lets the
 * user retry ONLY the failures, so a success is never re-created (no dupes).
 * On full success it locks and hands off to the Library via onAllPublished.
 */

import { useEffect, useState } from 'react';
import { KINLOOM_TYPE_SLUGS } from '../../../../lib/agent/tools';

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
  /**
   * False when this is one section of a longer, sectioned review and more
   * sections remain. The client then keeps the conversation open (via
   * onSectionPublished) instead of handing off to the Library. Undefined/true
   * means this is the last (or only) batch — publishing navigates away.
   */
  final_batch?: boolean;
};

type ItemStatus = 'idle' | 'publishing' | 'done' | 'error';

/** Fallback wait when a 429 arrives without a Retry-After we can read. */
const DEFAULT_COOLDOWN_SECONDS = 45;

type PublishResult = { ok: boolean; ulid?: string; title: string; error?: string };

type Props = {
  toolUseId: string;
  input: BatchInput;
  onKeepRefining: (toolUseId: string) => void;
  /** Called when the final (or only) batch is fully published — hands off to the Library. */
  onAllPublished: () => void;
  /**
   * Called when a non-final section (final_batch === false) is fully published.
   * Keeps the conversation open so the Biographer can propose the next section.
   */
  onSectionPublished: (toolUseId: string, publishedCount: number) => void;
};

// Turn a slug ('photo-collection') into a readable label ('Photo Collection').
function slugLabel(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function BiographerBatchCard({ input, toolUseId, onKeepRefining, onAllPublished, onSectionPublished }: Props) {
  const isFinalBatch = input.final_batch !== false;
  // A turn truncated at the output ceiling comes back with an EMPTY tool input,
  // so this array can be absent entirely. The route now catches that case and
  // never returns such a turn, but normalize here regardless: an unguarded
  // `.map` in a state initializer throws during render, and a render throw
  // escapes to the route-segment error boundary and unmounts the whole
  // conversation. A degraded, non-actionable card is a far better failure.
  const proposed = Array.isArray(input.proposed_kinlooms) ? input.proposed_kinlooms : [];
  // Editable working copy — edits and drops live here, not in the tool input,
  // so what the user sees is exactly what gets published.
  const [items, setItems] = useState<ProposedKinloom[]>(() => proposed.map(k => ({ ...k })));
  const [dropped, setDropped] = useState<boolean[]>(() => proposed.map(() => false));
  const [editing, setEditing] = useState<number | null>(null);

  const [statuses, setStatuses] = useState<ItemStatus[]>(() => proposed.map(() => 'idle'));
  const [errors, setErrors] = useState<Array<string | null>>(() => proposed.map(() => null));
  const [publishing, setPublishing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  // Rate-limit cooldown. Kept separate from `banner` (which reports genuine
  // per-item failures) because this one is transient and self-clearing: the
  // work isn't lost, it just can't continue yet.
  const [throttled, setThrottled] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Self-rescheduling tick. Counts down once per second and stops at zero, so
  // there's no interval left running once the wait is over.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const keptCount = dropped.filter(d => !d).length;
  // "All published" only counts kept items, and requires at least one kept.
  const allPublished =
    keptCount > 0 && items.every((_, i) => dropped[i] || statuses[i] === 'done');
  const failedCount = statuses.filter((s, i) => !dropped[i] && s === 'error').length;
  const hasAttempted = statuses.some((s, i) => !dropped[i] && s !== 'idle');

  const setItemField = (idx: number, field: keyof ProposedKinloom, value: string) => {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const toggleDropped = (idx: number) => {
    setDropped(prev => prev.map((d, i) => (i === idx ? !d : d)));
    if (editing === idx) setEditing(null);
  };

  const handlePublish = async () => {
    if (publishing || allPublished) return;

    // Only publish kept items not already created — a done item is never resent,
    // a dropped item is never sent at all.
    const targets = items.map((_, i) => i).filter(i => !dropped[i] && statuses[i] !== 'done');
    if (targets.length === 0) return;

    setEditing(null);
    setPublishing(true);
    setBanner(null);
    setThrottled(false);
    setCooldown(0);
    setStatuses(prev => prev.map((s, i) => (targets.includes(i) ? 'publishing' : s)));
    setErrors(prev => prev.map((e, i) => (targets.includes(i) ? null : e)));

    // Publish one draft per request, sequentially, resolving each item as it
    // lands. This keeps every request short (a big batch can't outrun a
    // platform timeout), surfaces live per-item progress instead of one long
    // silent wait, and records each success immediately — so a retry only
    // re-sends the items that genuinely failed, never re-creating a saved one.
    let failed = 0;
    // Set when the backend rate-limits us — signals we stopped early rather
    // than finished, and carries the wait so the banner can count it down.
    let rateLimited = false;
    let retryAfter: number | undefined;

    for (const idx of targets) {
      try {
        const res = await fetch('/api/agent/biographer/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drafts: [{
              title: items[idx].working_title,
              type_slug: items[idx].suggested_type_slug,
              body: items[idx].body,
            }],
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
            retryAfterSeconds?: number;
          };
          // A 429 is not this item's fault, and pressing on makes it worse:
          // every further request spends more of the same budget and pushes
          // the reset further out. Stop here and hand the remaining items back
          // to 'idle' — they were never attempted, so marking them 'error'
          // would inflate the retry count with work that never failed.
          if (res.status === 429) {
            rateLimited = true;
            retryAfter = data.retryAfterSeconds;
            setStatuses(prev => prev.map(s => (s === 'publishing' ? 'idle' : s)));
            break;
          }
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

    // Stopped early on a rate limit: some items may be saved, the rest are
    // untouched and still queued. Not a handoff — there's more to publish.
    // The wait is rendered as a live countdown rather than baked into the
    // banner text, so the number on screen stays true as it ticks down.
    if (rateLimited) {
      setThrottled(true);
      setCooldown(retryAfter ?? DEFAULT_COOLDOWN_SECONDS);
      setBanner(
        failed > 0
          ? `${failed} kinloom${failed === 1 ? '' : 's'} also couldn’t be saved.`
          : null,
      );
      return;
    }

    // targets were every kept, not-yet-done item, so zero failures this pass
    // means everything the user wants to keep is now saved.
    if (failed === 0) {
      // Final/only batch → hand off to the Library. A non-final section →
      // keep the conversation open so the next section can be proposed.
      if (isFinalBatch) {
        onAllPublished();
      } else {
        onSectionPublished(toolUseId, keptCount);
      }
    } else {
      setBanner(`${failed} kinloom${failed === 1 ? '' : 's'} couldn’t be saved. The rest were published — you can retry just the failures.`);
    }
  };

  const doneCount = statuses.filter((s, i) => !dropped[i] && s === 'done').length;
  // Kept items that still need sending. Diverges from keptCount once a run
  // partially completes — which a rate-limited stop now makes routine — so the
  // button promises what it will actually do rather than the batch total.
  const remainingCount = items.filter((_, i) => !dropped[i] && statuses[i] !== 'done').length;
  const publishLabel = publishing
    ? `Saving… (${doneCount}/${keptCount})`
    : allPublished
      ? 'Published'
      : failedCount > 0
        ? `Retry ${failedCount} failed`
        : keptCount === 0
          ? 'Nothing to publish'
          : isFinalBatch
            ? `Publish ${remainingCount} to your library`
            : `Publish ${remainingCount} & continue`;

  // Publishing during the cooldown just spends another request against a
  // budget that hasn't reset, so the action is held until the timer expires.
  const publishDisabled = publishing || allPublished || keptCount === 0 || cooldown > 0;

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
        {keptCount} kinloom{keptCount === 1 ? '' : 's'} to publish
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
          : 'The Biographer found these in the document. Edit or drop any of them, then publish the rest to your library — or keep refining.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {items.map((k, i) => {
          const status = statuses[i];
          const isDropped = dropped[i];
          const isEditing = editing === i;
          const locked = publishing || status === 'done';

          return (
            <div
              key={i}
              style={{
                background: 'var(--background)',
                border: `1px solid ${status === 'error' ? 'var(--destructive)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '16px 20px',
                opacity: status === 'done' ? 0.7 : isDropped ? 0.5 : 1,
              }}
            >
              {isEditing ? (
                <ItemEditor
                  item={k}
                  onChange={(field, value) => setItemField(i, field, value)}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 17,
                        fontWeight: 400,
                        color: 'var(--fg-1)',
                        lineHeight: 1.3,
                        margin: '0 0 4px',
                        textDecoration: isDropped ? 'line-through' : 'none',
                      }}
                    >
                      {k.working_title}
                    </p>
                    <StatusPill status={status} dropped={isDropped} />
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

                  {/* Per-item controls. Hidden once the item is saved — a
                      published kinloom can't be edited or dropped from here. */}
                  {status !== 'done' && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                      {isDropped ? (
                        <RowButton onClick={() => toggleDropped(i)} disabled={publishing}>
                          Restore
                        </RowButton>
                      ) : (
                        <>
                          <RowButton onClick={() => setEditing(i)} disabled={locked}>
                            Edit
                          </RowButton>
                          <RowButton onClick={() => toggleDropped(i)} disabled={locked} destructive>
                            Drop
                          </RowButton>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {throttled && (
        <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '0 0 16px', lineHeight: 1.55 }}>
          {cooldown > 0 ? (
            <>
              Too many requests right now. Anything already saved is safe — retrying only
              sends what&rsquo;s left.{' '}
              <strong style={{ fontWeight: 600 }}>
                Try again in {cooldown}s
              </strong>
            </>
          ) : (
            <>
              Ready to go. Anything already saved is safe — retrying only sends what&rsquo;s
              left. <strong style={{ fontWeight: 600 }}>Try again</strong>
            </>
          )}
        </p>
      )}

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
            {doneCount}/{keptCount} saved
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Inline per-item editor ─────────────────────────────────────────────────

function ItemEditor({
  item,
  onChange,
  onDone,
}: {
  item: ProposedKinloom;
  onChange: (field: keyof ProposedKinloom, value: string) => void;
  onDone: () => void;
}) {
  const fieldLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--fg-4)',
    margin: '0 0 6px',
    display: 'block',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={fieldLabel}>Title</label>
        <input
          type="text"
          value={item.working_title}
          onChange={e => onChange('working_title', e.target.value)}
          className="batch-input"
        />
      </div>

      <div>
        <label style={fieldLabel}>Type</label>
        <select
          value={item.suggested_type_slug}
          onChange={e => onChange('suggested_type_slug', e.target.value)}
          className="batch-input batch-select"
        >
          {KINLOOM_TYPE_SLUGS.map(slug => (
            <option key={slug} value={slug}>
              {slugLabel(slug)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={fieldLabel}>Summary</label>
        <input
          type="text"
          value={item.one_line_summary}
          onChange={e => onChange('one_line_summary', e.target.value)}
          className="batch-input"
        />
      </div>

      <div>
        <label style={fieldLabel}>Content</label>
        <textarea
          value={item.body}
          onChange={e => onChange('body', e.target.value)}
          rows={8}
          className="batch-input batch-textarea"
        />
      </div>

      <div>
        <button
          onClick={onDone}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

// A quiet text button for per-row actions (Edit / Drop / Restore).
function RowButton({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-btn${destructive ? ' text-btn--danger' : ''}`}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, dropped }: { status: ItemStatus; dropped: boolean }) {
  if (dropped) {
    return (
      <span style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0 }}>Dropped</span>
    );
  }
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
