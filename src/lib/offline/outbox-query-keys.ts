import type { OutboxFeature } from "./outbox-features";

export const outboxQueryKeys = {
  all: ["outbox"] as const,
  byFeature: (feature: OutboxFeature) => ["outbox", feature] as const,
};
