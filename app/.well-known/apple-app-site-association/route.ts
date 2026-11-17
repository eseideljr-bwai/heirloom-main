/**
 * GET /.well-known/apple-app-site-association — Universal Links (SOW D5).
 *
 * Lets iOS open /invite/{token} links in the Kinloom app when it's
 * installed. App IDs come from APPLE_APP_IDS ("TEAMID.bundle.id", comma
 * separated). Unset means no app is associated yet, so the file 404s and
 * invite links keep opening in the browser.
 *
 * Apple fetches this through its CDN and requires a 200 JSON response
 * with no redirect.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const appIDs = (process.env.APPLE_APP_IDS ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  if (appIDs.length === 0) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 });
  }

  return NextResponse.json(
    {
      applinks: {
        details: [
          {
            appIDs,
            components: [{ '/': '/invite/*', comment: 'Family Home and Family Space invitations' }],
          },
        ],
      },
    },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
