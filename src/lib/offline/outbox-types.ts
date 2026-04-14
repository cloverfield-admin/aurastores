import type { OutboxFeature } from "./outbox-features";

export type OutboxStatus = "pending" | "syncing" | "failed";

export type OutboxEntry = {
  id: string;
  feature: OutboxFeature;
  /** Logical operation (e.g. `sale.create`) — routed in outbox-handlers */
  kind: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: string;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
};

export type OutboxFeatureSummary = {
  pending: number;
  failed: number;
  syncing: number;
};

export type OutboxGlobalSummary = {
  byFeature: Record<OutboxFeature, OutboxFeatureSummary>;
  totalPending: number;
  totalFailed: number;
  totalSyncing: number;
};

export type OutboxState = {
  entries: OutboxEntry[];
  summary: OutboxGlobalSummary;
};
