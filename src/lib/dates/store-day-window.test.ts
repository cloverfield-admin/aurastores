import { describe, expect, it } from "vitest";

import {
  addStoreDays,
  resolveStoreDayWindow,
  storeDate,
  storeMonthStart,
  storeToday,
  zonedDayStart,
} from "@/lib/dates/store-day-window";

const LUSAKA = "Africa/Lusaka"; // UTC+2, no DST
const NEW_YORK = "America/New_York"; // UTC-5/-4, DST

describe("zonedDayStart", () => {
  it("resolves a store's midnight to the right instant", () => {
    // Lusaka's 1 August begins at 22:00Z on 31 July.
    expect(zonedDayStart(2026, 8, 1, LUSAKA).toISOString()).toBe("2026-07-31T22:00:00.000Z");
  });

  it("handles a zone behind UTC", () => {
    // New York in August is UTC-4.
    expect(zonedDayStart(2026, 8, 1, NEW_YORK).toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });

  it("is identity for UTC", () => {
    expect(zonedDayStart(2026, 8, 1, "UTC").toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });
});

describe("storeDate", () => {
  // A client sends ?start=YYYY-MM-DD — a calendar date, not an instant. It must
  // be re-anchored to the store's midnight, never converted into the store's
  // zone: 2026-08-01T00:00Z is still 31 July in New York, so converting would
  // land a day early.
  it("anchors the calendar date, not the instant", () => {
    const clientDate = new Date("2026-08-01T00:00:00.000Z");
    expect(storeDate(clientDate, NEW_YORK).toISOString()).toBe("2026-08-01T04:00:00.000Z");
    expect(storeDate("2026-08-01", NEW_YORK).toISOString()).toBe("2026-08-01T04:00:00.000Z");
  });

  it("accepts strings and Dates identically", () => {
    expect(storeDate("2026-08-01", LUSAKA).toISOString()).toBe(
      storeDate(new Date("2026-08-01T00:00:00.000Z"), LUSAKA).toISOString(),
    );
  });
});

describe("addStoreDays", () => {
  it("moves whole calendar days", () => {
    const start = zonedDayStart(2026, 8, 1, LUSAKA);
    expect(addStoreDays(start, 1, LUSAKA).toISOString()).toBe("2026-08-01T22:00:00.000Z");
    expect(addStoreDays(start, -1, LUSAKA).toISOString()).toBe("2026-07-30T22:00:00.000Z");
  });

  it("keeps the calendar date across a DST transition", () => {
    // US DST ends 1 November 2026: that day is 25 hours long, so +24h would
    // still be inside the 1st. Calendar arithmetic lands on the 2nd.
    const oct31 = zonedDayStart(2026, 10, 31, NEW_YORK);
    const nextDay = addStoreDays(oct31, 1, NEW_YORK);
    expect(nextDay.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    const dayAfter = addStoreDays(nextDay, 1, NEW_YORK);
    expect(dayAfter.toISOString()).toBe("2026-11-02T05:00:00.000Z"); // now UTC-5
  });
});

describe("storeMonthStart", () => {
  it("returns the store's 1st of the month", () => {
    const midMonth = zonedDayStart(2026, 8, 19, LUSAKA);
    expect(storeMonthStart(midMonth, LUSAKA).toISOString()).toBe("2026-07-31T22:00:00.000Z");
  });
});

describe("storeToday", () => {
  it("uses the store's calendar day, not the server's", () => {
    // 23:30Z on 18 August is already 01:30 on the 19th in Lusaka.
    const now = new Date("2026-08-18T23:30:00.000Z");
    expect(storeToday(LUSAKA, now).toISOString()).toBe("2026-08-18T22:00:00.000Z");
    // Same instant is still the 18th in New York.
    expect(storeToday(NEW_YORK, now).toISOString()).toBe("2026-08-18T04:00:00.000Z");
  });
});

describe("resolveStoreDayWindow", () => {
  const now = new Date("2026-08-19T09:00:00.000Z");

  it("covers the store's month to date", () => {
    const w = resolveStoreDayWindow(undefined, LUSAKA, "month-to-date", now);
    expect(w.startIso).toBe("2026-07-31T22:00:00.000Z");
    expect(w.endExclusiveIso).toBe("2026-08-19T22:00:00.000Z");
  });

  it("puts the previous period immediately before, at equal length", () => {
    const w = resolveStoreDayWindow(undefined, LUSAKA, "month-to-date", now);
    expect(w.prevEndExclusiveIso).toBe(w.startIso);
    expect(new Date(w.prevEndExclusiveIso).getTime() - new Date(w.prevStartIso).getTime()).toBe(
      w.endExclusive.getTime() - w.startInclusive.getTime(),
    );
  });

  it("honours an explicit range, end-inclusive", () => {
    const w = resolveStoreDayWindow({ start: "2026-08-01", end: "2026-08-07" }, LUSAKA, "month-to-date", now);
    expect(w.startIso).toBe("2026-07-31T22:00:00.000Z");
    expect(w.endExclusiveIso).toBe("2026-08-07T22:00:00.000Z");
    expect(w.endExclusive.getTime() - w.startInclusive.getTime()).toBe(7 * 86_400_000);
  });

  it("spans 30 inclusive days for the last-30-days default", () => {
    const w = resolveStoreDayWindow(undefined, LUSAKA, "last-30-days", now);
    expect(w.endExclusive.getTime() - w.startInclusive.getTime()).toBe(30 * 86_400_000);
  });

  it("is a single day for the today default", () => {
    const w = resolveStoreDayWindow(undefined, LUSAKA, "today", now);
    expect(w.endExclusive.getTime() - w.startInclusive.getTime()).toBe(86_400_000);
  });

  it("leaves UTC stores exactly as they were", () => {
    const w = resolveStoreDayWindow(undefined, "UTC", "month-to-date", now);
    expect(w.startIso).toBe("2026-08-01T00:00:00.000Z");
    expect(w.endExclusiveIso).toBe("2026-08-20T00:00:00.000Z");
  });
});
