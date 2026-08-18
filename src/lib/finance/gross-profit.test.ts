import { describe, expect, it } from "vitest";
import {
  computeGrossProfitCents,
  inventoryCostDeductedFromRevenue,
} from "@/lib/finance/gross-profit";

describe("gross profit", () => {
  const revenue = 500_000;
  const operating = 30_000;

  it("deducts COGS and operating expenses", () => {
    const cogs = 120_000;
    expect(inventoryCostDeductedFromRevenue(cogs)).toBe(120_000);
    expect(
      computeGrossProfitCents({
        revenueCents: revenue,
        cogsCents: cogs,
        operatingExpensesCents: operating,
      }).grossProfitCents,
    ).toBe(revenue - 120_000 - operating);
  });

  it("does not deduct restocking spend, however large", () => {
    // Restocking used to be deducted as max(0, restocking - cogs). With COGS at
    // 50_000 and restocking at 120_000 the old result was revenue - 120_000 -
    // operating; stock bought but not yet sold is not a cost of sales.
    const cogs = 50_000;
    expect(
      computeGrossProfitCents({
        revenueCents: revenue,
        cogsCents: cogs,
        operatingExpensesCents: operating,
      }).grossProfitCents,
    ).toBe(revenue - 50_000 - operating);
  });

  it("moves by a sale's margin, not its selling price", () => {
    const base = { cogsCents: 45_000, operatingExpensesCents: operating };
    const before = computeGrossProfitCents({ revenueCents: revenue, ...base }).grossProfitCents;
    // One more sale: 3_400 on the ticket, 1_420 of stock consumed.
    const after = computeGrossProfitCents({
      revenueCents: revenue + 3_400,
      cogsCents: base.cogsCents + 1_420,
      operatingExpensesCents: operating,
    }).grossProfitCents;
    expect(after - before).toBe(3_400 - 1_420);
  });

  it("goes negative when costs exceed revenue", () => {
    expect(
      computeGrossProfitCents({
        revenueCents: 10_000,
        cogsCents: 40_000,
        operatingExpensesCents: operating,
      }).grossProfitCents,
    ).toBe(10_000 - 40_000 - operating);
  });
});
