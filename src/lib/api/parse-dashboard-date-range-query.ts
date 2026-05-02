import { NextResponse } from "next/server";
import type { SalesDateRange } from "@/lib/repositories/sales/sales.repository";

/** Same cap as sales dashboard export / metrics. */
export const DASHBOARD_DATE_RANGE_MAX_DAYS = 93;

export function parseIsoDateParam(value: string | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function differenceInDaysInclusiveUtc(start: Date, end: Date) {
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

/**
 * Parse optional `start` / `end` (YYYY-MM-DD, UTC calendar days) from a request URL.
 * When both are absent, returns `range: undefined` (caller uses repository default window).
 */
export function parseOptionalDashboardDateRangeQuery(url: URL):
  | { ok: true; range: SalesDateRange | undefined }
  | { ok: false; response: NextResponse } {
  const startParam = url.searchParams.get("start");
  const endParam = url.searchParams.get("end");

  if ((startParam && !endParam) || (!startParam && endParam)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Both start and end dates are required when filtering." },
        { status: 400 },
      ),
    };
  }

  if (!startParam && !endParam) {
    return { ok: true, range: undefined };
  }

  const startDate = parseIsoDateParam(startParam);
  const endDate = parseIsoDateParam(endParam);
  if ((startParam && !startDate) || (endParam && !endDate)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid date filter. Use YYYY-MM-DD for start and end." },
        { status: 400 },
      ),
    };
  }

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Start date must be before or equal to end date." },
        { status: 400 },
      ),
    };
  }

  if (startDate && endDate) {
    const rangeDays = differenceInDaysInclusiveUtc(startDate, endDate);
    if (rangeDays > DASHBOARD_DATE_RANGE_MAX_DAYS) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: `Date range too large. Maximum is ${DASHBOARD_DATE_RANGE_MAX_DAYS} days.` },
          { status: 400 },
        ),
      };
    }
  }

  return { ok: true, range: { start: startDate!, end: endDate! } };
}
