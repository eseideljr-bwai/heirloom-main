/**
 * Durable batch store for the Biographer import track (per-item editing).
 *
 * The proposed kinlooms from a `split_into_multiple` emission are promoted to a
 * first-class, editable array stored under its OWN sessionStorage key,
 * decoupled from the conversation history. This array — not the model's tool
 * input — is the source of truth for rendering and publishing the batch. The
 * tool input is used only to (re)initialize it (Phase A).
 *
 * Two phases (see the per-item-edit design, "Phase A → Phase B" spine):
 *   'A' — pre-edit, model-owned. The array MIRRORS the latest
 *         split_into_multiple emission; a new emission (new tool_use id)
 *         replaces it. The demo verbatim guard, if present, applies here.
 *   'B' — post-first-edit/drop, user-owned. The array is FROZEN as the sole
 *         source of truth; later emissions are discarded (the in-flight race
 *         rule). The model no longer sees or regenerates the batch.
 *
 * Two orthogonal status axes per item — never merged into one enum:
 *   lifecycle — proposed | accepted | edited | dropped. Accept is implicit:
 *               anything not dropped publishes. `edited` is a display badge.
 *   publish   — idle | publishing | done | error. Publish-attempt state,
 *               with retry-only-failures driven off `done`.
 */

const BATCH_KEY = 'kinloom:import:batch';

export type LifecycleStatus = 'proposed' | 'accepted' | 'edited' | 'dropped';
export type PublishStatus = 'idle' | 'publishing' | 'done' | 'error';
export type BatchPhase = 'A' | 'B';

export type DurableKinloom = {
  /** Client-side only, stable across reload; never sent to the model. */
  id: string;
  working_title: string;
  /** Review-list label only — NOT persisted on publish. */
  one_line_summary: string;
  body: string;
  suggested_type_slug: string;
  lifecycle: LifecycleStatus;
  publish: PublishStatus;
  publishError?: string | null;
};

export type DurableBatch = {
  /** tool_use id of the split_into_multiple emission this array reflects. */
  sourceToolUseId: string;
  phase: BatchPhase;
  items: DurableKinloom[];
};

/** Fields the user may edit directly (Phase B). `one_line_summary` is not here. */
export type EditablePatch = Partial<
  Pick<DurableKinloom, 'working_title' | 'body' | 'suggested_type_slug'>
>;

type ProposedInput = {
  working_title?: unknown;
  one_line_summary?: unknown;
  body?: unknown;
  suggested_type_slug?: unknown;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Build a fresh Phase A batch from a split_into_multiple emission. Item ids are
 * derived from the emission's tool_use id + index — deterministic (no RNG),
 * stable across reload, and unique per item. Because a new emission carries a
 * new tool_use id, Phase A replacement is a clean swap with fresh ids.
 */
export function buildBatchFromEmission(toolUseId: string, proposed: unknown): DurableBatch {
  const arr = Array.isArray(proposed) ? proposed : [];
  const items: DurableKinloom[] = arr.map((raw, i) => {
    const p = (raw ?? {}) as ProposedInput;
    return {
      id: `${toolUseId}:${i}`,
      working_title: str(p.working_title),
      one_line_summary: str(p.one_line_summary),
      body: str(p.body),
      suggested_type_slug: str(p.suggested_type_slug),
      lifecycle: 'proposed' as const,
      publish: 'idle' as const,
      publishError: null,
    };
  });
  return { sourceToolUseId: toolUseId, phase: 'A', items };
}

export function loadBatch(): DurableBatch | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(BATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DurableBatch;
    if (!parsed || typeof parsed.sourceToolUseId !== 'string' || !Array.isArray(parsed.items)) {
      return null;
    }
    // A 'publishing' status can't survive a reload — an in-flight publish was
    // interrupted. Coerce those items back to idle so the UI never loads stuck.
    parsed.items = parsed.items.map(it =>
      it.publish === 'publishing' ? { ...it, publish: 'idle' as const } : it,
    );
    return parsed;
  } catch {
    return null;
  }
}

export function saveBatch(batch: DurableBatch): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BATCH_KEY, JSON.stringify(batch));
  } catch {
    // sessionStorage full or unavailable — not fatal
  }
}

export function clearBatch(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(BATCH_KEY);
  } catch {
    // ignore
  }
}

// ─── Pure batch domain logic (Phase A ↔ Phase B) ────────────────────────────

/** A split_into_multiple emission, decoupled from the model content block type. */
export type SplitEmission = { id: string; proposed: unknown };

/**
 * Reconcile the durable batch against a (possibly new) emission:
 *   • no emission this turn → unchanged.
 *   • no batch yet → build one (Phase A).
 *   • Phase B (frozen) → unchanged. This is the in-flight race rule AND the
 *     reload guarantee: a frozen batch wins over the stale tool input, and a
 *     late full-batch re-emission after editing began is DISCARDED.
 *   • Phase A, same emission id → unchanged (no-op on re-render/reload).
 *   • Phase A, new emission id → replace with the latest emission (mirroring).
 */
export function reconcileBatch(
  prev: DurableBatch | null,
  emission: SplitEmission | null,
): DurableBatch | null {
  if (!emission) return prev;
  if (!prev) return buildBatchFromEmission(emission.id, emission.proposed);
  if (prev.phase === 'B') return prev;
  if (prev.sourceToolUseId === emission.id) return prev;
  return buildBatchFromEmission(emission.id, emission.proposed);
}

/**
 * First committed edit freezes the batch into Phase B. The edited item's
 * lifecycle becomes `edited`; every sibling is byte-identical and untouched.
 */
export function applyEdit(batch: DurableBatch, id: string, patch: EditablePatch): DurableBatch {
  return {
    ...batch,
    phase: 'B',
    items: batch.items.map(it => (it.id === id ? { ...it, ...patch, lifecycle: 'edited' } : it)),
  };
}

/** Drop an item (implicit accept: anything not dropped publishes). Freezes to Phase B. */
export function applyDrop(batch: DurableBatch, id: string): DurableBatch {
  return {
    ...batch,
    phase: 'B',
    items: batch.items.map(it => (it.id === id ? { ...it, lifecycle: 'dropped' } : it)),
  };
}

/** Restore a dropped item. Content is preserved; the badge returns to `proposed`. */
export function applyRestore(batch: DurableBatch, id: string): DurableBatch {
  return {
    ...batch,
    items: batch.items.map(it => (it.id === id ? { ...it, lifecycle: 'proposed' } : it)),
  };
}

/**
 * Items that a Publish should send: non-dropped and not already created. A
 * dropped item is never sent (implicit accept); a `done` item is never resent
 * (retry-only-failures, no duplicates). Order is preserved for result zipping.
 */
export function publishTargets(items: DurableKinloom[]): DurableKinloom[] {
  return items.filter(it => it.lifecycle !== 'dropped' && it.publish !== 'done');
}
