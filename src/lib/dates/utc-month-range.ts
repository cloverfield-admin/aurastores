/**
 * UTC calendar month window for billing-style counters (no local timezone).
 */
export function utcMonthRangeForInstant(now: Date): { startInclusive: Date; endExclusive: Date } {
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const startInclusive = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  return { startInclusive, endExclusive };
}

/** Milliseconds from `now` until the next UTC month boundary (exclusive end of the current month). */
export function msUntilNextUtcMonthStart(now: Date = new Date()): number {
  const { endExclusive } = utcMonthRangeForInstant(now);
  return Math.max(0, endExclusive.getTime() - now.getTime());
}
