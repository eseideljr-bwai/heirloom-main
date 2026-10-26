/**
 * POST /api/agent/biographer/publish
 *
 * Batch-publish endpoint for the Biographer (Import) propose path. The
 * client sends the array of refined drafts from the BiographerBatchCard;
 * this route loops the SAME single-create call the publish wizard uses
 * (POST /kinlooms — see createKinloom / lib/kinloom.ts) once per draft,
 * server-side, attaching the Bearer via the shared token resolver.
 *
 * Each import is created `final` with `capture_mode: "import"` and no
 * `publish` key, so it lands wherever the author's default publish target
 * says (their Family Home, or private). The kinloom belongs to the author's
 * Vault either way.
 *
 * NOT transactional. Looping the single-create endpoint means a mid-batch
 * failure leaves some kinlooms created and some not. We therefore return a
 * per-item result (ok / ulid / error) so the client can mark which
 * succeeded and retry ONLY the failures — never re-creating a success, so
 * no duplicates. An atomic all-or-nothing publish would be a dedicated
 * Laravel batch endpoint (JC), not this frontend loop.
 *
 * The author comes from the Bearer token, never from the request body.
 * The session check reaches Laravel for /me, so it can fail independently
 * of the drafts; it returns a structured result rather than throwing,
 * because an escaped error here used to collapse the whole batch into an
 * opaque 500.
 *
 * Request:  { drafts: Array<{ title; type_slug; body; visibility? }> }
 *           `visibility: "private"` keeps that draft out of every room.
 * Response: { results: Array<{ ok; ulid?; title; error? }> }
 */

import { NextResponse } from 'next/server';
import { resolveActiveSpaceForRoute } from '../../../../../lib/server/auth';
import { ApiError } from '../../../../../lib/server/api';
import { serverKinloomApi } from '../../../../../lib/server/kinloom-api';
import { KINLOOM_TYPE_SLUGS } from '../../../../../lib/agent/tools';
import { KINLOOM_TYPES } from '../../../../lib/kinloom-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_SLUGS = new Set<string>(KINLOOM_TYPE_SLUGS);
// Label → slug fallback, so a display label ("Message") that somehow reaches
// this route is still coerced to the enum slug the create endpoint validates.
const LABEL_TO_SLUG = new Map<string, string>(
  KINLOOM_TYPES.map(t => [t.label.toLowerCase(), t.slug]),
);

/** Coerce a draft's type to the enum slug, mapping a label through if needed. */
function normalizeSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (VALID_SLUGS.has(value)) return value;
  const fromLabel = LABEL_TO_SLUG.get(value.toLowerCase());
  return fromLabel ?? null;
}

type IncomingDraft = {
  title?: unknown;
  type_slug?: unknown;
  body?: unknown;
  visibility?: unknown;
};

type ItemResult = { ok: boolean; ulid?: string; title: string; error?: string };

export async function POST(request: Request): Promise<NextResponse> {
  const session = await resolveActiveSpaceForRoute('agent/biographer/publish');
  if (session.ok === false) {
    return NextResponse.json(
      { error: session.error, retryAfterSeconds: session.retryAfterSeconds },
      { status: session.status },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const drafts = (raw as { drafts?: unknown })?.drafts;
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json({ error: '`drafts` must be a non-empty array.' }, { status: 400 });
  }

  const results: ItemResult[] = [];

  // Sequential loop — one create per draft. Kept sequential (not Promise.all)
  // so a partial failure leaves a predictable, ordered result set and we
  // don't hammer the backend with a burst.
  for (const d of drafts as IncomingDraft[]) {
    const title = typeof d.title === 'string' ? d.title.trim() : '';
    const body = typeof d.body === 'string' ? d.body.trim() : '';
    const slug = normalizeSlug(d.type_slug);
    const keepPrivate = typeof d.visibility === 'string' && d.visibility.trim() === 'private';
    const label = title || '(untitled)';

    if (!slug) {
      results.push({ ok: false, title: label, error: `Unknown kinloom type "${String(d.type_slug)}".` });
      continue;
    }
    if (!body) {
      results.push({ ok: false, title: label, error: 'This kinloom has no content to save.' });
      continue;
    }

    try {
      const created = await serverKinloomApi.post('/kinlooms', {
        body: {
          type_slug: slug,
          title: title || 'Untitled',
          body,
          status: 'final',
          capture_mode: 'import',
          // No `publish` key: the author's default publish target applies.
          ...(keepPrivate ? { publish: [] } : {}),
        },
      });
      results.push({ ok: true, ulid: created.id, title: label });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? (err.firstFieldError() || err.message)
          : 'Could not save this kinloom.';
      results.push({ ok: false, title: label, error: message });
    }
  }

  // One line per batch so a partial failure is visible without reconstructing
  // it from the per-request upstream logs. The failing titles are included
  // because "3 failed" on its own doesn't say which items need a retry.
  const created = results.filter(r => r.ok).length;
  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    console.warn(
      `[agent/biographer/publish] ${drafts.length} draft(s): ${created} created, ${failures.length} failed — ` +
        failures.map(f => `"${f.title}": ${f.error ?? 'unknown error'}`).join('; '),
    );
  } else {
    console.log(`[agent/biographer/publish] ${drafts.length} draft(s): all ${created} created`);
  }

  return NextResponse.json({ results });
}
