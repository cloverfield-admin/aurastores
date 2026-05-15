export function computeExcessRestockingCents(restockingCents: number, cogsCents: number) {
  return Math.max(0, restockingCents - cogsCents);
}

export function computeGrossProfitCents(params: {
  revenueCents: number;
  cogsCents: number;
  operatingExpensesCents: number;
  restockingCents: number;
}) {
  const excessRestockingCents = computeExcessRestockingCents(
    params.restockingCents,
    params.cogsCents,
  );
  return {
    excessRestockingCents,
    grossProfitCents:
      params.revenueCents -
      params.cogsCents -
      params.operatingExpensesCents -
      excessRestockingCents,
  };
}

/** Inventory cost removed from revenue (COGS + excess restocking). */
export function inventoryCostDeductedFromRevenue(cogsCents: number, restockingCents: number) {
  return cogsCents + computeExcessRestockingCents(restockingCents, cogsCents);
}
