export const OUTBOX_FEATURES = ["sales", "stock"] as const;

export type OutboxFeature = (typeof OUTBOX_FEATURES)[number];

export function isOutboxFeature(value: string): value is OutboxFeature {
  return (OUTBOX_FEATURES as readonly string[]).includes(value);
}

export const OUTBOX_FEATURE_LABELS: Record<OutboxFeature, string> = {
  sales: "Sales",
  stock: "Stock",
};
