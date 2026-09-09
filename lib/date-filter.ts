/** YYYY-MM-DD, the only shape we accept from `?from=` / `?to=`. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDayParam(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && DAY.test(value) ? value : '';
}

/** Calendar day of an ISO timestamp, UTC, or null if unparseable. */
export function createdDay(iso: string | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function matchesDateRange(
  createdAt: string | undefined,
  from: string,
  to: string,
): boolean {
  if (!from && !to) return true;
  const day = createdDay(createdAt);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
