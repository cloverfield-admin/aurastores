/**
 * Day-count for range labels ("… vs prior 30d").
 *
 * The window itself is resolved server-side in the store's timezone — see
 * store-day-window. This works on two YYYY-MM-DD strings that have already been
 * chosen, so it is timezone-independent and safe on the client.
 */
export function inclusiveUtcDayCount(startInclusive: Date, endInclusive: Date) {
  return Math.max(1, Math.round((endInclusive.getTime() - startInclusive.getTime()) / 86_400_000) + 1);
}
