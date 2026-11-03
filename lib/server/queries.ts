/**
 * Server-side query helpers shared by SSR pages.
 *
 * Reads go through `serverKinloomApi` (which reads the HttpOnly id_token
 * cookie via next/headers) and are wrapped in `react.cache` so multiple
 * server components in the same request share one round-trip.
 *
 * Mutations (POST/PATCH/DELETE) stay in lib/*.ts and are called from client
 * components through the `/api/proxy` BFF.
 */

import 'server-only';
import { cache } from 'react';
import { serverKinloomApi } from './kinloom-api';

/** GET /family-homes/{id}: profile, people, stats, featured, where you left off. */
export const getFamilyHome = cache(async (homeId: string) =>
  serverKinloomApi.get('/family-homes/{familyHome}', { path: { familyHome: homeId } }),
);
