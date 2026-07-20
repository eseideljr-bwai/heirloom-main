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
