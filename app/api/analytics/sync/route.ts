import { NextResponse, type NextRequest } from 'next/server';
import { parseSyncRequest, runSync } from '../../../../lib/server/analytics-sync/core';
import {
  HubSpotHttpError,
  createHubSpotClient,
  hubspotSubscriptionEnabled,
  hubspotSyncEnabled,
} from '../../../../lib/server/analytics-sync/hubspot-client';
import { createKinloomReader } from '../../../../lib/server/analytics-sync/kinloom-reader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/sync — Kinloom → HubSpot contact sync (Phase 2).
 *
 * Body: { reason, invitation?: { kind, id, space_id? }, marketing_opt_in?, from_marketing_email? }
 * Identity: the HttpOnly session cookies only (D12), proved by GET /me.
 * The browser never sends property values or invitee emails; any extra
 * field is dropped by parseSyncRequest.
 *
 * Fire-and-forget: 204 whether it wrote, skipped or HubSpot failed. 401 only
 * when there's no signed-in member, 400 for a malformed body, 403 cross-site.
 * Does nothing unless HUBSPOT_SYNC_ENABLED=1.
 */
export async function POST(req: NextRequest) {
  // Same-origin only. (SameSite=Lax already keeps the cookies off a
  // cross-site POST; this makes the refusal explicit.)
  const origin = req.headers.get('origin');
  if (origin) {
    let sameOrigin = false;
    try { sameOrigin = new URL(origin).host === req.headers.get('host'); } catch { /* bad header */ }
    if (!sameOrigin) return new NextResponse(null, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const request = parseSyncRequest(body);
  if (!request) return new NextResponse(null, { status: 400 });

  if (!hubspotSyncEnabled()) return new NextResponse(null, { status: 204 });

  try {
    const result = await runSync(request, {
      kinloom: createKinloomReader(),
      hubspot: createHubSpotClient(),
      now: () => new Date(),
      subscriptionEnabled: hubspotSubscriptionEnabled(),
      warn: code => console.warn(`[analytics-sync] ${code} reason=${request.reason}`),
    });
    if (result.outcome === 'unauthenticated') return new NextResponse(null, { status: 401 });
  } catch (err) {
    // HubSpot down / rejected: never the member's problem. Codes only.
    const code = err instanceof HubSpotHttpError ? err.message : err instanceof Error ? err.name : 'unknown';
    console.warn(`[analytics-sync] failed ${code} reason=${request.reason}`);
  }
  return new NextResponse(null, { status: 204 });
}
