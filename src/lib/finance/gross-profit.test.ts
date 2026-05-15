import { describe, expect, it } from "vitest";
import {
  computeGrossProfitCents,
  inventoryCostDeductedFromRevenue,
} from "@/lib/finance/gross-profit";

describe("gross profit with excess restocking", () => {
  const revenue = 500_000;
  const operating = 30_000;

  it("deducts COGS only when restocking is below COGS", () => {
    const cogs = 120_000;
    const restocking = 50_000;
    expect(inventoryCostDeductedFromRevenue(cogs, restocking)).toBe(120_000);
    expect(computeGrossProfitCents({ revenueCents: revenue, cogsCents: cogs, operatingExpensesCents: operating, restockingCents: restocking }).grossProfitCents).toBe(
      revenue - 120_000 - operating,
    );
  });

  it("deducts COGS plus excess when restocking exceeds COGS", () => {
    const cogs = 50_000;
    const restocking = 120_000;
    expect(inventoryCostDeductedFromRevenue(cogs, restocking)).toBe(120_000);
    expect(computeGrossProfitCents({ revenueCents: revenue, cogsCents: cogs, operatingExpensesCents: operating, restockingCents: restocking }).excessRestockingCents).toBe(70_000);
    expect(computeGrossProfitCents({ revenueCents: revenue, cogsCents: cogs, operatingExpensesCents: operating, restockingCents: restocking }).grossProfitCents).toBe(
      revenue - 120_000 - operating,
    );
  });

  it("deducts all restocking when COGS is zero", () => {
    const cogs = 0;
    const restocking = 80_000;
    expect(inventoryCostDeductedFromRevenue(cogs, restocking)).toBe(80_000);
    expect(computeGrossProfitCents({ revenueCents: revenue, cogsCents: cogs, operatingExpensesCents: operating, restockingCents: restocking }).grossProfitCents).toBe(
      revenue - 80_000 - operating,
    );
  });

  it("deducts COGS only when there is no restocking", () => {
    const cogs = 200_000;
    const restocking = 0;
    expect(inventoryCostDeductedFromRevenue(cogs, restocking)).toBe(200_000);
    expect(computeGrossProfitCents({ revenueCents: revenue, cogsCents: cogs, operatingExpensesCents: operating, restockingCents: restocking }).grossProfitCents).toBe(
      revenue - 200_000 - operating,
    );
  });
});
