import type { SalesDateRange } from "@/lib/repositories/sales/sales.repository";

function normalizeDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

/**
 * UTC date-window semantics aligned with {@link SalesRepositoryImpl.getDashboard}:
 * inclusive start day, inclusive end day, half-open filter `[start, endExclusive)`.
 * Previous period is the immediately preceding window of equal length.
 */
export function resolveDashboardUtcRangeWindow(range?: SalesDateRange) {
  const endInclusive = normalizeDate(range?.end ?? startOfTodayUtc());
  const startInclusive = normalizeDate(range?.start ?? addDaysUtc(endInclusive, -29));
  const endExclusive = addDaysUtc(endInclusive, 1);

  const windowMs = endExclusive.getTime() - startInclusive.getTime();
  const previousEndExclusive = startInclusive;
  const previousStartInclusive = new Date(previousEndExclusive.getTime() - windowMs);

  return {
    startInclusive,
    endInclusive,
    endExclusive,
    startIso: startInclusive.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
    prevStartIso: previousStartInclusive.toISOString(),
    prevEndExclusiveIso: previousEndExclusive.toISOString(),
  };
}

export function inclusiveUtcDayCount(startInclusive: Date, endInclusive: Date) {
  return Math.max(1, Math.round((endInclusive.getTime() - startInclusive.getTime()) / 86_400_000) + 1);
}
