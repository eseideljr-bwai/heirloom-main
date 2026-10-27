/**
 * Types and URL building for the Phase 3 Kinloom API, derived from the
 * OpenAPI contract in `./kinloom.d.ts` (regenerate with `npm run api:types`).
 *
 * Nothing here talks to the network, so both the browser client
 * (`lib/kinloom-api.ts`) and the server client (`lib/server/kinloom-api.ts`)
 * share it. A route that does not exist in the contract, a missing path
 * param, or a wrong body shape is a compile error, not a runtime 404.
 */

import type { paths } from './kinloom';

export type { paths, components } from './kinloom';

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Every route in the contract that answers `M`.
 *
 * The `[X] extends [never]` wrapping is deliberate: this project compiles
 * with `strict: false`, where an absent method (`put?: never`) is `never`,
 * and a bare `never extends object` is true.
 */
export type PathsFor<M extends Method> = {
  [P in keyof paths]: [paths[P][M]] extends [never] ? never : P;
}[keyof paths];

export type OperationOf<P extends keyof paths, M extends Method> = paths[P][M];

type PathParamsOf<O> = O extends { parameters: { path: infer X } }
  ? [X] extends [never]
    ? never
    : X
  : never;

type QueryOf<O> = O extends { parameters: { query?: infer X } }
  ? [X] extends [never]
    ? never
    : X
  : never;

type BodyOf<O> = O extends { requestBody?: infer R }
  ? [R] extends [never]
    ? never
    : R extends { content: { 'application/json': infer B } }
      ? B
      : never
  : never;

type JsonOf<R> = R extends { content: { 'application/json': infer J } } ? J : undefined;

/** The body of the first 2xx response the contract documents. */
export type ResponseOf<O> = O extends { responses: infer R }
  ? { [S in keyof R & (200 | 201 | 202 | 204)]: JsonOf<R[S]> }[keyof R & (200 | 201 | 202 | 204)]
  : never;

/** What the caller supplies. Only the parts the route needs are accepted. */
export type RequestArgs<O> = ([PathParamsOf<O>] extends [never]
  ? { path?: undefined }
  : { path: PathParamsOf<O> }) &
  ([QueryOf<O>] extends [never] ? { query?: undefined } : { query?: QueryOf<O> }) &
  ([BodyOf<O>] extends [never] ? { body?: undefined } : { body: BodyOf<O> });

/** `init` becomes optional when the route needs nothing. */
export type InitTuple<O> = {} extends RequestArgs<O>
  ? [init?: RequestArgs<O>]
  : [init: RequestArgs<O>];

type Primitive = string | number | boolean;

/** Fill `{param}` placeholders and append the query string. */
export function buildUrl(
  template: string,
  path?: Record<string, unknown>,
  query?: Record<string, unknown>,
): string {
  const url = template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = path?.[name];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing path param "${name}" for ${template}`);
    }
    return encodeURIComponent(String(value));
  });

  if (!query) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    // The contract names array params `types[]`; repeat the key per value.
    if (Array.isArray(value)) {
      for (const v of value as Primitive[]) search.append(key, String(v));
    } else {
      search.append(key, String(value as Primitive));
    }
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}
