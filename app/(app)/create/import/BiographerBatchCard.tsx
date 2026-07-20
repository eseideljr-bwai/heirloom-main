'use client';

/**
 * BiographerBatchCard — rendered when the Biographer calls split_into_multiple.
 *
 * CONTROLLED over the durable batch (lib/biographer/batch-store). The card no
 * longer reads the model's tool input; its source of truth is the `batch` prop
 * (items + phase), owned and persisted by BiographerView. Rendering, editing,
 * dropping, and publishing all read/write that durable array — so an edit to
 * one item never regenerates its siblings (the voice guarantee).
 *
 * Per-item editing (Phase B): each item has an Edit affordance (title, body,
 * type) and a Drop toggle. The FIRST committed edit or drop transitions the
 * batch to Phase B (frozen; the model is out — see BiographerView). Editing is
 * direct text — no model call — so an edited item is exactly the user's words.
 * `one_line_summary` is a review-list label only and is never saved, so it is
 * shown read-only.
 *
 * Publish still loops the single-create endpoint server-side
 * (POST /api/agent/biographer/publish) once per non-dropped draft and reports a
 * per-item result. That loop is NOT transactional, so a mid-batch failure
 * leaves some kinlooms created: each item's publish status (idle | publishing |
 * done | error) is tracked SEPARATELY from its lifecycle status, and the user
 * can retry ONLY the failures — never re-creating a success (no dupes). On full
 * success it hands off to the Library via onAllPublished.
 */

import { useState } from 'react';
import { KINLOOM_TYPES } from '../../../lib/kinloom-types';
import type { DurableBatch, DurableKinloom, EditablePatch } from '../../../../lib/biographer/batch-store';

/** Legacy shape kept for the split_into_multiple tool input cast in the view. */
export type ProposedKinloom = {
  working_title: string;
  one_line_summary: string;
  body: string;
  suggested_type_slug: string;
};

export type BatchInput = {
  proposed_kinlooms: ProposedKinloom[];
  reasoning?: string;
};

type PublishResult = { ok: boolean; ulid?: string; title: string; error?: string };

type Props = {
  toolUseId: string;
  batch: DurableBatch;
  onEditItem: (id: string, patch: EditablePatch) => void;
  onDropItem: (id: string) => void;
  onRestoreItem: (id: string) => void;
  onPublishItems: (updater: (items: DurableKinloom[]) => DurableKinloom[]) => void;
  onKeepRefining: (toolUseId: string) => void;
  /** Called once every non-dropped kinloom has been created. */
  onAllPublished: () => void;
};

function slugLabel(slug: string): string {
  return KINLOOM_TYPES.find(t => t.slug === slug)?.label ?? slug.replace('-', '‑');
}

export function BiographerBatchCard({
  batch,
  toolUseId,
  onEditItem,
  onDropItem,
  onRestoreItem,
  onPublishItems,
  onKeepRefining,
  onAllPublished,
}: Props) {
  const items = batch.items;
  const phase = batch.phase;

  const [publishing, setPublishing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const active = items.filter(i => i.lifecycle !== 'dropped');
  const targets = active.filter(i => i.publish !== 'done');
  const allPublished = active.length > 0 && active.every(i => i.publish === 'done');
  const failedCount = active.filter(i => i.publish === 'error').length;
  const hasAttempted = items.some(i => i.publish !== 'idle');
  const publishingCount = items.filter(i => i.publish === 'publishing').length;

  const handlePublish = async () => {
    if (publishing || allPublished) return;

    // Only non-dropped items that aren't already created. A done item is never
    // resent; a dropped item is never sent at all (implicit accept).
    const toSend = items.filter(it => it.lifecycle !== 'dropped' && it.publish !== 'done');
    if (toSend.length === 0) return;
    const sendIds = new Set(toSend.map(t => t.id));

    setPublishing(true);
    setBanner(null);
    onPublishItems(prev =>
      prev.map(it => (sendIds.has(it.id) ? { ...it, publish: 'publishing', publishError: null } : it)),
    );

    try {
      const res = await fetch('/api/agent/biographer/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drafts: toSend.map(t => ({
            title: t.working_title,
            type_slug: t.suggested_type_slug,
            body: t.body,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Publish failed (${res.status})`);
      }
      const data = (await res.json()) as { results: PublishResult[] };

      // Zip results back onto items by id (results are in the same order as
      // `toSend`). Use the id map so a concurrent parent update can't misalign.
      const outcome = new Map<string, PublishResult>();
      toSend.forEach((t, j) => {
        if (data.results[j]) outcome.set(t.id, data.results[j]);
      });
      onPublishItems(prev =>
        prev.map(it => {
          const r = outcome.get(it.id);
          if (!r) return it;
          return r.ok
            ? { ...it, publish: 'done', publishError: null }
            : { ...it, publish: 'error', publishError: r.error ?? 'Could not save this kinloom.' };
        }),
      );

      const allOk = data.results.length >= toSend.length && toSend.every((_, j) => data.results[j]?.ok);
      if (allOk) {
        onAllPublished();
      } else {
        const failed = toSend.filter((_, j) => !data.results[j]?.ok).length;
        setBanner(
          `${failed} kinloom${failed === 1 ? '' : 's'} couldn’t be saved. The rest were published — you can retry just the failures.`,
        );
      }
    } catch (err) {
      // Route-level / network failure: none of this batch landed. Mark the
      // in-flight items error so the retry path re-sends exactly them.
      onPublishItems(prev =>
        prev.map(it => (sendIds.has(it.id) ? { ...it, publish: 'error', publishError: null } : it)),
      );
      setBanner(err instanceof Error ? err.message : 'Something went wrong publishing.');
    } finally {
      setPublishing(false);
    }
  };

  const publishLabel = publishing
    ? `Publishing ${publishingCount} kinloom${publishingCount === 1 ? '' : 's'}…`
    : allPublished
      ? 'Published'
      : failedCount > 0
        ? `Retry ${failedCount} failed`
        : `Publish ${targets.length} to your library`;

  const nothingToPublish = targets.length === 0 && !allPublished; // e.g. everything dropped
  const publishDisabled = publishing || allPublished || nothingToPublish;

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
        {active.length} kinloom{active.length === 1 ? '' : 's'} found
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--fg-3)', margin: '0 0 24px' }}>
        {allPublished
          ? 'All saved to your library.'
          : 'The Biographer found these in the document. Edit any of them, drop what you don’t want, then publish — or keep refining.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {items.map(item =>
          editingId === item.id ? (
            <ItemEditor
              key={item.id}
              item={item}
              onSave={patch => {
                onEditItem(item.id, patch);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <ItemRow
              key={item.id}
              item={item}
              busy={publishing}
              onEdit={() => setEditingId(item.id)}
              onDrop={() => onDropItem(item.id)}
              onRestore={() => onRestoreItem(item.id)}
            />
          ),
        )}
      </div>

      {banner && (
        <p style={{ fontSize: 13, color: 'var(--destructive)', margin: '0 0 16px', lineHeight: 1.55 }}>
          {banner}
        </p>
      )}

      {nothingToPublish && (
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 16px', lineHeight: 1.55 }}>
          Every kinloom is dropped — there’s nothing to publish. Use “Import” at the top to start over.
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
        {/* E4 cut: "Keep refining" (the only model re-entry) disappears once the
            batch enters Phase B. After editing, the model never regenerates. */}
        {phase === 'A' && !allPublished && (
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
            {active.filter(i => i.publish === 'done').length}/{active.length} published
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Item row (read/display) ────────────────────────────────────────────────

function ItemRow({
  item,
  busy,
  onEdit,
  onDrop,
  onRestore,
}: {
  item: DurableKinloom;
  busy: boolean;
  onEdit: () => void;
  onDrop: () => void;
  onRestore: () => void;
}) {
  const dropped = item.lifecycle === 'dropped';
  const done = item.publish === 'done';
  const error = item.publish === 'error';
  // A persisted item can't be re-saved, so it can't be edited or dropped. While
  // a publish is in flight, freeze edits to avoid racing the network payload.
  const canMutate = !done && !busy && item.publish !== 'publishing';

  return (
    <div
      style={{
        background: 'var(--background)',
        border: `1px solid ${error ? 'var(--destructive)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '16px 20px',
        opacity: done || dropped ? 0.6 : 1,
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
            textDecoration: dropped ? 'line-through' : 'none',
          }}
        >
          {item.working_title || '(untitled)'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LifecycleBadge lifecycle={item.lifecycle} />
          <PublishPill status={item.publish} />
        </div>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg-3)', margin: '0 0 6px' }}>
        {item.one_line_summary}
      </p>
      <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>{slugLabel(item.suggested_type_slug)}</p>

      {error && item.publishError && (
        <p style={{ fontSize: 12, color: 'var(--destructive)', margin: '8px 0 0', lineHeight: 1.5 }}>
          {item.publishError}
        </p>
      )}

      {!done && (
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          {dropped ? (
            <RowAction label="Restore" onClick={onRestore} disabled={busy} />
          ) : (
            <>
              <RowAction label="Edit" onClick={onEdit} disabled={!canMutate} />
              <RowAction label="Drop" onClick={onDrop} disabled={!canMutate} muted />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RowAction({
  label,
  onClick,
  disabled,
  muted,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        color: muted ? 'var(--fg-4)' : 'var(--primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textDecoration: 'underline',
      }}
    >
      {label}
    </button>
  );
}

// ─── Item editor (Phase B direct edit) ──────────────────────────────────────

function ItemEditor({
  item,
  onSave,
  onCancel,
}: {
  item: DurableKinloom;
  onSave: (patch: EditablePatch) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(item.working_title);
  const [typeSlug, setTypeSlug] = useState(item.suggested_type_slug);
  const [body, setBody] = useState(item.body);

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--input-background)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontSize: 14,
    color: 'var(--foreground)',
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--fg-4)',
    margin: '0 0 6px',
    display: 'block',
  };

  return (
    <div
      style={{
        background: 'var(--background)',
        border: '1px solid var(--primary)',
        borderRadius: 10,
        padding: '18px 20px',
      }}
    >
      <label style={labelStyle}>
        Title
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ ...fieldStyle, marginTop: 6 }}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: 16 }}>
        Type
        <select
          value={typeSlug}
          onChange={e => setTypeSlug(e.target.value)}
          style={{ ...fieldStyle, marginTop: 6 }}
        >
          {KINLOOM_TYPES.map(t => (
            <option key={t.slug} value={t.slug}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label style={{ ...labelStyle, marginTop: 16 }}>
        Content
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={8}
          style={{
            ...fieldStyle,
            marginTop: 6,
            fontFamily: 'var(--font-serif)',
            fontSize: 16,
            lineHeight: 1.7,
            resize: 'vertical',
          }}
        />
      </label>

      {/* Summary is a review-list label only — never saved — so it is not editable. */}
      <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '10px 0 0', lineHeight: 1.5 }}>
        {item.one_line_summary}
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button
          onClick={() => onSave({ working_title: title, suggested_type_slug: typeSlug, body })}
          style={{
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            border: 'none',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '9px 18px',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--fg-2)',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Badges ─────────────────────────────────────────────────────────────────

function LifecycleBadge({ lifecycle }: { lifecycle: DurableKinloom['lifecycle'] }) {
  if (lifecycle === 'edited') {
    return <Badge text="Edited" color="var(--primary)" />;
  }
  if (lifecycle === 'dropped') {
    return <Badge text="Dropped" color="var(--fg-4)" />;
  }
  return null;
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${color}`,
        borderRadius: 999,
        padding: '2px 8px',
        flexShrink: 0,
      }}
    >
      {text}
    </span>
  );
}

function PublishPill({ status }: { status: DurableKinloom['publish'] }) {
  if (status === 'done') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', flexShrink: 0 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
        Saved
      </span>
    );
  }
  if (status === 'publishing') {
    return <span style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0 }}>Saving…</span>;
  }
  if (status === 'error') {
    return <span style={{ fontSize: 11, color: 'var(--destructive)', flexShrink: 0 }}>Failed</span>;
  }
  return null;
}
