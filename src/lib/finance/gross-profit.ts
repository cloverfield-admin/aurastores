export function computeGrossProfitCents(params: {
  revenueCents: number;
  cogsCents: number;
  operatingExpensesCents: number;
}) {
  return {
    grossProfitCents: params.revenueCents - params.cogsCents - params.operatingExpensesCents,
  };
}

/**
 * Inventory cost removed from revenue. Restocking spend is deliberately not
 * part of this: buying stock moves money into inventory rather than consuming
 * it, and that cost reaches the P&L as COGS once the item sells.
 *
 * The previous formula also deducted max(0, restocking - cogs), i.e.
 * max(cogs, restocking) in total. Whenever restocking spend led COGS, a sale's
 * own cost cancelled out and profit moved by the full selling price.
 */
export function inventoryCostDeductedFromRevenue(cogsCents: number) {
  return cogsCents;
}
