import { del, get, set } from "idb-keyval";
import type { OutboxFeature } from "./outbox-features";
import { isOutboxFeature } from "./outbox-features";
import { runOutboxHandler } from "./outbox-handlers";
import type {
  OutboxEntry,
  OutboxFeatureSummary,
  OutboxGlobalSummary,
  OutboxState,
} from "./outbox-types";

export type {
  OutboxEntry,
  OutboxFeatureSummary,
  OutboxGlobalSummary,
  OutboxState,
  OutboxStatus,
} from "./outbox-types";

const OUTBOX_KEY_V1 = "aurapharma-offbox-v1";
const OUTBOX_KEY = "aurapharma-offbox-v2";

const OUTBOX_FLUSH_MAX_ATTEMPTS = 8;

type LegacyOutboxEntry = Omit<OutboxEntry, "feature"> & { feature?: string };

function notifyOutboxChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aurapharma:outbox-changed"));
}

function inferFeatureFromKind(kind: string): OutboxFeature {
  if (kind.includes("stock") || kind.includes("adjustment")) {
    return "stock";
  }
  return "sales";
}

function isOutboxEntry(value: unknown): value is OutboxEntry {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.kind === "string" &&
    typeof o.idempotencyKey === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.attempts === "number" &&
    typeof o.feature === "string" &&
    isOutboxFeature(o.feature) &&
    (o.status === "pending" || o.status === "syncing" || o.status === "failed")
  );
}

function isLegacyOutboxRow(value: unknown): value is LegacyOutboxEntry {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.kind === "string" &&
    typeof o.idempotencyKey === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.attempts === "number" &&
    (o.status === "pending" || o.status === "syncing" || o.status === "failed")
  );
}

function normalizeStuckSyncing(entries: OutboxEntry[]): OutboxEntry[] {
  return entries.map((e) => (e.status === "syncing" ? { ...e, status: "pending" as const } : e));
}

async function migrateV1ToV2IfNeeded(): Promise<void> {
  const existingV2 = await get<unknown>(OUTBOX_KEY);
  const rawV1 = await get<unknown>(OUTBOX_KEY_V1);
  if (Array.isArray(existingV2) && existingV2.length > 0) {
    if (Array.isArray(rawV1) && rawV1.length > 0) {
      await del(OUTBOX_KEY_V1);
    }
    return;
  }
  if (!Array.isArray(rawV1) || rawV1.length === 0) {
    return;
  }
  const migrated: OutboxEntry[] = [];
  for (const row of rawV1) {
    if (!isLegacyOutboxRow(row)) continue;
    const feature: OutboxFeature =
      row.feature && isOutboxFeature(row.feature) ? row.feature : inferFeatureFromKind(row.kind);
    migrated.push({
      ...row,
      feature,
      status: row.status === "syncing" ? "pending" : row.status,
    });
  }
  if (migrated.length > 0) {
    await set(OUTBOX_KEY, migrated);
  }
  await del(OUTBOX_KEY_V1);
}

async function readAll(): Promise<OutboxEntry[]> {
  await migrateV1ToV2IfNeeded();
  const raw = await get<unknown>(OUTBOX_KEY);
  if (!Array.isArray(raw)) return [];
  const parsed = raw.filter(isOutboxEntry);
  const normalized = normalizeStuckSyncing(parsed);
  if (normalized.some((e, i) => e !== parsed[i])) {
    await set(OUTBOX_KEY, normalized);
  }
  return normalized;
}

async function writeAll(entries: OutboxEntry[]): Promise<void> {
  await set(OUTBOX_KEY, entries);
  notifyOutboxChanged();
}

/**
 * Queue a mutation for later sync. Deduplicates by `idempotencyKey` (returns existing row).
 */
export async function enqueueOutboxEntry(
  input: Omit<OutboxEntry, "createdAt" | "status" | "attempts">,
): Promise<OutboxEntry> {
  const list = await readAll();
  const existing = list.find((e) => e.idempotencyKey === input.idempotencyKey);
  if (existing) {
    return existing;
  }
  const entry: OutboxEntry = {
    ...input,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
  };
  list.push(entry);
  await writeAll(list);
  return entry;
}

export async function listOutboxPending(): Promise<OutboxEntry[]> {
  const list = await readAll();
  return list.filter((e) => e.status === "pending" || e.status === "failed");
}

export async function listOutboxByFeature(feature: OutboxFeature): Promise<OutboxEntry[]> {
  const list = await readAll();
  return list.filter((e) => e.feature === feature);
}

function buildSummary(entries: OutboxEntry[]): OutboxGlobalSummary {
  const empty = (): OutboxFeatureSummary => ({ pending: 0, failed: 0, syncing: 0 });
  const byFeature: Record<OutboxFeature, OutboxFeatureSummary> = {
    sales: empty(),
    stock: empty(),
  };
  let totalPending = 0;
  let totalFailed = 0;
  let totalSyncing = 0;
  for (const e of entries) {
    const bucket = byFeature[e.feature];
    if (e.status === "pending") {
      bucket.pending += 1;
      totalPending += 1;
    } else if (e.status === "failed") {
      bucket.failed += 1;
      totalFailed += 1;
    } else if (e.status === "syncing") {
      bucket.syncing += 1;
      totalSyncing += 1;
    }
  }
  return { byFeature, totalPending, totalFailed, totalSyncing };
}

export async function getOutboxState(): Promise<OutboxState> {
  const entries = await readAll();
  return { entries, summary: buildSummary(entries) };
}

export async function listOutboxFlushable(): Promise<OutboxEntry[]> {
  const list = await listOutboxPending();
  return list.filter(
    (e) => e.status === "pending" || (e.status === "failed" && e.attempts < OUTBOX_FLUSH_MAX_ATTEMPTS),
  );
}

export async function getOutboxSummary(): Promise<OutboxGlobalSummary> {
  return (await getOutboxState()).summary;
}

export async function updateOutboxEntry(
  id: string,
  patch: Partial<Pick<OutboxEntry, "status" | "attempts" | "lastError">>,
): Promise<void> {
  const list = await readAll();
  const next = list.map((e) => (e.id === id ? { ...e, ...patch } : e));
  await writeAll(next);
}

export async function removeOutboxEntry(id: string): Promise<void> {
  const list = await readAll();
  await writeAll(list.filter((e) => e.id !== id));
}

/** Reset a failed entry for another flush attempt. */
export async function retryOutboxEntry(id: string): Promise<void> {
  await updateOutboxEntry(id, { status: "pending", lastError: undefined });
}

/** Clear persisted queue (e.g. sign-out). */
export async function clearOutbox(): Promise<void> {
  await del(OUTBOX_KEY);
  await del(OUTBOX_KEY_V1);
  notifyOutboxChanged();
}

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Request failed.";
}

export async function flushOutbox(
  opts?: { signal?: AbortSignal },
): Promise<{ processed: number; kinds: string[] }> {
  const signal = opts?.signal;
  let processed = 0;
  const kindsFlushed: string[] = [];
  const flushable = (await listOutboxFlushable()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const entry of flushable) {
    if (signal?.aborted) break;

    const nextAttempts = entry.attempts + 1;
    await updateOutboxEntry(entry.id, { status: "syncing", attempts: nextAttempts, lastError: undefined });

    try {
      await runOutboxHandler(entry);
      await removeOutboxEntry(entry.id);
      kindsFlushed.push(entry.kind);
      processed += 1;
    } catch (err) {
      const failed = nextAttempts >= OUTBOX_FLUSH_MAX_ATTEMPTS;
      await updateOutboxEntry(entry.id, {
        status: failed ? "failed" : "pending",
        lastError: toErrorMessage(err),
      });
    }
  }

  return { processed, kinds: [...new Set(kindsFlushed)] };
}
