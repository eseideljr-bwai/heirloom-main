/**
 * Typed browser client for the Phase 3 Kinloom API.
 *
 *   import { kinloomApi } from '@/lib/kinloom-api';
 *   const page = await kinloomApi.get('/vault', { query: { audience: 'private' } });
 *   await kinloomApi.put('/kinlooms/{kinloom}/publications', {
 *     path: { kinloom: id },
 *     body: { ... },
 *   });
 *
 * Routes, params, bodies and responses are checked against the OpenAPI
 * contract. Transport (BFF proxy, ApiError, activity tracking, the iOS
 * 401 signal) is `apiFetch`, unchanged.
 *
 * Server components use `lib/server/kinloom-api.ts`, same call shape.
 */

import { apiFetch, type ApiFetchOptions } from './api';
import {
  buildUrl,
  type InitTuple,
  type Method,
  type OperationOf,
  type PathsFor,
  type ResponseOf,
} from './api-schema/typed';


function call<M extends Method>(method: M) {
  return <P extends PathsFor<M>>(
    path: P,
    ...args: InitTuple<OperationOf<P, M>>
  ): Promise<ResponseOf<OperationOf<P, M>>> => {
    const [init] = args as [
      { path?: Record<string, unknown>; query?: Record<string, unknown>; body?: unknown } | undefined,
    ];
    return apiFetch(buildUrl(path, init?.path, init?.query), {
      method: method.toUpperCase(),
      body: init?.body,
    });
  };
}

export const kinloomApi = {
  get: call('get'),
  post: call('post'),
  put: call('put'),
  patch: call('patch'),
  delete: call('delete'),
};
