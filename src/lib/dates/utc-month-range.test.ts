import { describe, expect, it } from "vitest";
import { msUntilNextUtcMonthStart, utcMonthRangeForInstant } from "./utc-month-range";

describe("utcMonthRangeForInstant", () => {
  it("returns Jan 2026 window for mid-January UTC", () => {
    const now = new Date(Date.UTC(2026, 0, 15, 12, 30, 0));
    const { startInclusive, endExclusive } = utcMonthRangeForInstant(now);
    expect(startInclusive.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("handles last day of January (rolls February start)", () => {
    const now = new Date(Date.UTC(2026, 0, 31, 23, 59, 59));
    const { startInclusive, endExclusive } = utcMonthRangeForInstant(now);
    expect(startInclusive.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2026-02-01T00:00:00.000Z");
  });

  it("rolls December to next year for endExclusive", () => {
    const now = new Date(Date.UTC(2026, 11, 1, 0, 0, 0));
    const { startInclusive, endExclusive } = utcMonthRangeForInstant(now);
    expect(startInclusive.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(endExclusive.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

describe("msUntilNextUtcMonthStart", () => {
  it("returns time until first instant of next month", () => {
    const now = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
    const ms = msUntilNextUtcMonthStart(now);
    const expected = new Date(Date.UTC(2026, 1, 1, 0, 0, 0)).getTime() - now.getTime();
    expect(ms).toBe(expected);
  });

  it("is non-negative for any reference time", () => {
    expect(msUntilNextUtcMonthStart(new Date(Date.UTC(2026, 5, 10, 8, 0, 0)))).toBeGreaterThanOrEqual(0);
  });
});
