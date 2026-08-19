import { describe, expect, it } from "vitest";

import {
  annualSaving,
  billingRoleLabel,
  canChangePlanTier,
  daysUntil,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatMsisdnInput,
  intervalLabel,
  isBillingRole,
  maskTail,
  networkForMsisdn,
  normalizeZambianMsisdn,
} from "@/lib/billing/web-portal";

describe("who may use the billing portal", () => {
  it("admits owners and managers only", () => {
    expect(isBillingRole("owner")).toBe(true);
    expect(isBillingRole("manager")).toBe(true);
    for (const role of ["pharmacist", "cashier", "analyst", "admin", "aurastores_admin", "", null]) {
      expect(isBillingRole(role)).toBe(false);
    }
  });

  it("labels the roles the way the product names them", () => {
    expect(billingRoleLabel("owner")).toBe("STORE OWNER");
    expect(billingRoleLabel("manager")).toBe("STORE MANAGER");
  });

  // Managers keep the lights on; moving the org to another tier is the owner's call.
  it("lets only owners change the plan tier", () => {
    expect(canChangePlanTier("owner")).toBe(true);
    expect(canChangePlanTier("manager")).toBe(false);
  });
});

describe("money", () => {
  it("formats ZMW in en-US", () => {
    expect(formatMoney(500_000)).toBe("ZMW 5,000.00");
    expect(formatMoney(50_050)).toBe("ZMW 500.50");
  });

  it("drops trailing zeros for headline prices", () => {
    expect(formatMoneyCompact(500_000)).toBe("ZMW 5,000");
    expect(formatMoneyCompact(50_050)).toBe("ZMW 500.50");
  });
});

describe("annual saving", () => {
  it("expresses the discount in whole months", () => {
    // ZMW 500/month, ZMW 5,000/year ⇒ two months free.
    expect(annualSaving(50_000, 500_000)).toEqual({ amountCents: 100_000, monthsFree: 2 });
  });

  it("is null when annual is not actually cheaper", () => {
    expect(annualSaving(50_000, 600_000)).toBeNull();
    expect(annualSaving(50_000, 700_000)).toBeNull();
  });

  it("is null when either price is missing", () => {
    expect(annualSaving(undefined, 500_000)).toBeNull();
    expect(annualSaving(50_000, undefined)).toBeNull();
  });
});

describe("Zambian mobile money numbers", () => {
  it("normalizes local spellings to the engine's MSISDN", () => {
    for (const input of ["0977842210", "+260 97 784 2210", "260977842210", "97 784 2210"]) {
      expect(normalizeZambianMsisdn(input)).toBe("260977842210");
    }
  });

  it("rejects anything that is not nine national digits", () => {
    expect(normalizeZambianMsisdn("097784")).toBeNull();
    expect(normalizeZambianMsisdn("09778422101")).toBeNull();
    expect(normalizeZambianMsisdn("")).toBeNull();
  });

  it("groups digits while typing", () => {
    expect(formatMsisdnInput("0977842210")).toBe("97 784 2210");
    expect(formatMsisdnInput("0977")).toBe("97 7");
  });

  // The engine picks the operator from the number; this only catches typos.
  it("identifies the network from the prefix", () => {
    expect(networkForMsisdn("260967842210")).toBe("mtn");
    expect(networkForMsisdn("260977842210")).toBe("airtel");
    expect(networkForMsisdn("260957842210")).toBe("zamtel");
    expect(networkForMsisdn("260917842210")).toBeNull();
    expect(networkForMsisdn(null)).toBeNull();
  });
});

describe("dates", () => {
  // Day-first with the en-US month abbreviation: plain en-US orders it
  // "Sep 12, 2026" and en-GB spells September "Sept" — neither matches the comp.
  it("formats day-first, in UTC, so a label cannot drift a day", () => {
    expect(formatDate("2026-09-12T00:00:00.000Z")).toBe("12 Sep 2026");
    expect(formatDate("2026-09-12T23:30:00.000Z")).toBe("12 Sep 2026");
    expect(formatDate("2026-08-12T00:00:00.000Z")).toBe("12 Aug 2026");
  });

  it("returns null for missing or unparseable input", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("not a date")).toBeNull();
  });

  it("counts whole days remaining, floored at zero", () => {
    const now = new Date("2026-08-19T00:00:00.000Z");
    expect(daysUntil("2026-09-12T00:00:00.000Z", now)).toBe(24);
    expect(daysUntil("2026-08-19T00:00:00.000Z", now)).toBe(0);
    expect(daysUntil("2026-08-01T00:00:00.000Z", now)).toBe(0);
  });
});

describe("presentation helpers", () => {
  it("calls the yearly interval Annual, as the design does", () => {
    expect(intervalLabel("yearly")).toBe("Annual");
    expect(intervalLabel("monthly")).toBe("Monthly");
  });

  it("masks a reference to its last four digits", () => {
    expect(maskTail("260977842210")).toBe("··· 2210");
    expect(maskTail("abc")).toBeNull();
    expect(maskTail(null)).toBeNull();
  });
});
