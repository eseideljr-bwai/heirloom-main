import { ApiError } from '../api';

/**
 * Resolve a server query to `null` instead of throwing.
 *
 * Space-scoped endpoints can legitimately refuse a request — a non-owner
 * hitting an owner-only route, or a membership the backend no longer
 * honours even though /me still lists the space. Those are permission
 * edges, not bugs, and a page should say so rather than render Next's
 * unhandled-error overlay.
 *
 * Anything that isn't an ApiError is re-thrown: a TypeError here is a
 * real defect and should not be swallowed.
 */
export async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}
