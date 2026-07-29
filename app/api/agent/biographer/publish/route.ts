/**
 * POST /api/agent/biographer/publish
 *
 * Batch-publish endpoint for the Biographer (Import) propose path. The
 * client sends the array of refined drafts from the BiographerBatchCard;
 * this route loops the SAME single-create call the publish wizard uses
 * (POST /family-spaces/{familySpace}/kinlooms — see createKinloom /
 * lib/kinloom.ts) once per draft, server-side, attaching the Bearer via
 * the shared serverApiFetch token resolver.
 *
 * NOT transactional. Looping the single-create endpoint means a mid-batch
 * failure leaves some kinlooms created and some not. We therefore return a
 * per-item result (ok / ulid / error) so the client can mark which
 * succeeded and retry ONLY the failures — never re-creating a success, so
 * no duplicates. An atomic all-or-nothing publish would be a dedicated
 * Laravel batch endpoint (JC), not this frontend loop.
 *
 * The family space id is resolved server-side from the session
 * (getActiveSpaceId) and the author from the Bearer token — neither is
 * trusted from the request body.
 *
 * Request:  { drafts: Array<{ title; type_slug; body; visibility? }> }
 * Response: { results: Array<{ ok; ulid?; title; error? }> }
 */

import { NextResponse } from 'next/server';
import { getActiveSpaceId } from '../../../../../lib/server/auth';
import { serverApiFetch, ApiError } from '../../../../../lib/server/api';
import { KINLOOM_TYPE_SLUGS } from '../../../../../lib/agent/tools';
import { KINLOOM_TYPES } from '../../../../lib/kinloom-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Default visibility for imported kinlooms. The single-create wizard sends
// visibility explicitly (create-context default is 'family'); the batch
// drafts don't carry one, so we mirror that default here.
const DEFAULT_VISIBILITY = 'family';

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
  const spaceId = await getActiveSpaceId();
  if (!spaceId) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
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
    const visibility =
      typeof d.visibility === 'string' && d.visibility.trim()
        ? d.visibility.trim()
        : DEFAULT_VISIBILITY;
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
      const created = await serverApiFetch<{ ulid: string }>(
        `/family-spaces/${encodeURIComponent(spaceId)}/kinlooms`,
        {
          method: 'POST',
          body: {
            type_slug: slug,
            title: title || 'Untitled',
            body,
            visibility,
            status: 'published',
          },
        },
      );
      results.push({ ok: true, ulid: created.ulid, title: label });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? (err.firstFieldError() || err.message)
          : 'Could not save this kinloom.';
      results.push({ ok: false, title: label, error: message });
    }
  }

  return NextResponse.json({ results });
}
