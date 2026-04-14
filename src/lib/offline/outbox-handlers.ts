import { postCreateSale, postStockAdjustment } from "@/lib/api/offline-requests";
import type { CreateSaleInput } from "@/lib/validation/sales";
import type { StockAdjustmentInput } from "@/lib/validation/stock";
import {
  OUTBOX_KIND_SALE_CREATE,
  OUTBOX_KIND_STOCK_ADJUSTMENT,
  type OutboxKind,
} from "./outbox-kinds";
import type { OutboxEntry } from "./outbox-types";

const handlers: Partial<Record<OutboxKind, (entry: OutboxEntry) => Promise<void>>> = {
  [OUTBOX_KIND_SALE_CREATE]: async (entry) => {
    await postCreateSale(entry.payload as CreateSaleInput, { idempotencyKey: entry.idempotencyKey });
  },
  [OUTBOX_KIND_STOCK_ADJUSTMENT]: async (entry) => {
    await postStockAdjustment(entry.payload as StockAdjustmentInput, {
      idempotencyKey: entry.idempotencyKey,
    });
  },
};

export async function runOutboxHandler(entry: OutboxEntry): Promise<void> {
  const fn = handlers[entry.kind as OutboxKind];
  if (!fn) {
    throw new Error(`Unknown outbox kind: ${entry.kind}`);
  }
  await fn(entry);
}
