import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema/branch.schema";

/**
 * Day boundaries for the dashboards are the STORE's calendar days, not UTC's.
 *
 * A shop in Africa/Lusaka (UTC+2) opens its books at 00:00 local, which is 22:00
 * UTC the day before. Measuring in UTC attributes the first two hours of local
 * trading to yesterday and cuts month-to-date two hours late. The engine's daily
 * briefing and sales-summary notification already work in `branches.timezone`,
 * so a UTC dashboard disagrees with the briefing about the same day's takings.
 *
 * There is no date library in this project, so the zone maths runs on Intl.
 */

const UTC = "UTC";
const DAY_MS = 86_400_000;

function partsIn(instant: Date, timeZone: string, withTime: boolean) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit" as const, minute: "2-digit" as const, second: "2-digit" as const } : {}),
  }).formatToParts(instant);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((p) => p.type === type)?.value ?? 0);

  return {
    year: at("year"),
    month: at("month"),
    day: at("day"),
    // Some ICU builds render midnight as hour 24 under hour12:false.
    hour: at("hour") % 24,
    minute: at("minute"),
    second: at("second"),
  };
}

/**
 * Offset (ms) that `timeZone` is ahead of UTC at `instant` — what to add to a
 * UTC clock to get that zone's wall clock.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = partsIn(instant, timeZone, true);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - instant.getTime();
}

/**
 * The instant at which the given calendar date begins in `timeZone`.
 *
 * Two passes: guess at UTC, measure the zone's offset there, then re-measure at
 * the corrected instant so a DST transition lands on the right side. (Zambia has
 * no DST, but a store elsewhere would.)
 */
export function zonedDayStart(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const firstOffset = zoneOffsetMs(new Date(guess), timeZone);
  const candidate = new Date(guess - firstOffset);
  const secondOffset = zoneOffsetMs(candidate, timeZone);
  return secondOffset === firstOffset ? candidate : new Date(guess - secondOffset);
}

/** Midnight at the start of the store's current day. */
export function storeToday(timeZone: string, now: Date = new Date()): Date {
  const p = partsIn(now, timeZone, false);
  return zonedDayStart(p.year, p.month, p.day, timeZone);
}

/**
 * Re-anchors a calendar date the client already chose (`?start=2026-08-01`,
 * which parses to UTC midnight) to midnight in the store's zone.
 *
 * Note this reads the date's UTC fields rather than converting the instant:
 * converting would land a day early at any negative UTC offset, because
 * 2026-08-01T00:00Z is still 31 July in New York.
 */
export function storeDate(value: string | Date, timeZone: string): Date {
  if (typeof value === "string") {
    const [year, month, day] = value.split("-").map(Number);
    return zonedDayStart(year, month, day, timeZone);
  }
  return zonedDayStart(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(), timeZone);
}

/**
 * Shifts a store day start by whole calendar days. Calendar arithmetic rather
 * than +n*24h, so a 23- or 25-hour DST day still lands on the intended date.
 */
export function addStoreDays(dayStart: Date, days: number, timeZone: string): Date {
  const p = partsIn(dayStart, timeZone, false);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedDayStart(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), timeZone);
}

/** Midnight on the 1st of the store's month containing `dayStart`. */
export function storeMonthStart(dayStart: Date, timeZone: string): Date {
  const p = partsIn(dayStart, timeZone, false);
  return zonedDayStart(p.year, p.month, 1, timeZone);
}

/**
 * A store day start rendered as YYYY-MM-DD in the store's own calendar — the key
 * SQL produces with to_char(date_trunc('day', ts at time zone tz), ...).
 */
export function storeDateKey(dayStart: Date, timeZone: string): string {
  const p = partsIn(dayStart, timeZone, false);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Whole days spanned by an inclusive day range. */
export function storeDayCount(startInclusive: Date, endInclusive: Date): number {
  return Math.max(1, Math.round((endInclusive.getTime() - startInclusive.getTime()) / DAY_MS) + 1);
}

/**
 * The timezone a store measures its days in: the given branch's, else the org's
 * primary branch. Falls back to UTC — the old behaviour — so a missing, blank or
 * unrecognised zone degrades rather than throws.
 */
export async function storeTimeZone(organizationId: string, branchId?: string | null): Promise<string> {
  const rows = branchId
    ? await db.select({ timezone: branches.timezone }).from(branches).where(eq(branches.id, branchId)).limit(1)
    : await db
        .select({ timezone: branches.timezone })
        .from(branches)
        .where(eq(branches.organizationId, organizationId))
        .orderBy(desc(branches.isPrimary), asc(branches.createdAt))
        .limit(1);

  const timezone = rows[0]?.timezone?.trim();
  if (!timezone) return UTC;
  try {
    // Throws RangeError on an unknown zone name.
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return UTC;
  }
}

export type StoreDayWindow = {
  startInclusive: Date;
  endInclusive: Date;
  endExclusive: Date;
  startIso: string;
  endExclusiveIso: string;
  prevStartIso: string;
  prevEndExclusiveIso: string;
  timeZone: string;
};

export type StoreWindowDefault = "month-to-date" | "last-30-days" | "today";

/**
 * Store-local window in the shape the dashboards already use: inclusive start
 * day, inclusive end day, half-open `[start, endExclusive)` filter, and a
 * previous period of equal length immediately preceding it.
 */
export function resolveStoreDayWindow(
  range: { start?: string | Date; end?: string | Date } | undefined,
  timeZone: string,
  fallback: StoreWindowDefault,
  now: Date = new Date(),
): StoreDayWindow {
  const endInclusive = range?.end ? storeDate(range.end, timeZone) : storeToday(timeZone, now);
  const startInclusive = range?.start
    ? storeDate(range.start, timeZone)
    : fallback === "month-to-date"
      ? storeMonthStart(endInclusive, timeZone)
      : fallback === "last-30-days"
        ? addStoreDays(endInclusive, -29, timeZone)
        : endInclusive;

  const endExclusive = addStoreDays(endInclusive, 1, timeZone);
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
    timeZone,
  };
}
