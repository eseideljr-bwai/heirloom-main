import 'server-only';

/**
 * Typed server-side client for the Phase 3 Kinloom API. Same call shape as
 * the browser client (`lib/kinloom-api.ts`); transport is `serverApiFetch`
 * (Bearer from the session, uncached by default).
 *
 *   const me = await serverKinloomApi.get('/me');
 */

import { serverApiFetch, type ServerFetchOptions } from './api';
import {
  buildUrl,
  type InitTuple,
  type Method,
  type OperationOf,
  type PathsFor,
  type ResponseOf,
} from '../api-schema/typed';


function call<M extends Method>(method: M) {
  return <P extends PathsFor<M>>(
    path: P,
    ...args: InitTuple<OperationOf<P, M>>
  ): Promise<ResponseOf<OperationOf<P, M>>> => {
    const [init] = args as [
      { path?: Record<string, unknown>; query?: Record<string, unknown>; body?: unknown } | undefined,
    ];
    return serverApiFetch(buildUrl(path, init?.path, init?.query), {
      method: method.toUpperCase(),
      body: init?.body,
    });
  };
}

export const serverKinloomApi = {
  get: call('get'),
  post: call('post'),
  put: call('put'),
  patch: call('patch'),
  delete: call('delete'),
};
