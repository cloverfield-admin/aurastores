/** Keep in sync with handlers in `outbox-handlers.ts`. */
export const OUTBOX_KIND_SALE_CREATE = "sale.create" as const;
export const OUTBOX_KIND_STOCK_ADJUSTMENT = "stock.adjustment" as const;

export type OutboxKind = typeof OUTBOX_KIND_SALE_CREATE | typeof OUTBOX_KIND_STOCK_ADJUSTMENT;

export const OUTBOX_KIND_LABELS: Record<OutboxKind, string> = {
  [OUTBOX_KIND_SALE_CREATE]: "Create sale",
  [OUTBOX_KIND_STOCK_ADJUSTMENT]: "Stock adjustment",
};
