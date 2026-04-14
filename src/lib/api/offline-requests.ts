import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import type { CreateSaleInput } from "@/lib/validation/sales";
import type { StockAdjustmentInput } from "@/lib/validation/stock";

export type CreateSaleResponse = {
  id: string;
  saleNumber: string;
  status: string;
  totalCents: number;
};

export type StockAdjustmentResponse = {
  adjustedCount: number;
  batchIds: string[];
  productNames: string[];
  updatedBatches: Array<{
    id: string;
    quantityAvailable: number;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
  }>;
};

function withIdempotencyHeader(
  headers: Record<string, string>,
  idempotencyKey?: string,
): Record<string, string> {
  if (idempotencyKey?.trim()) {
    return { ...headers, "Idempotency-Key": idempotencyKey.trim() };
  }
  return headers;
}

export async function postCreateSale(
  payload: CreateSaleInput,
  opts?: { idempotencyKey?: string },
): Promise<CreateSaleResponse> {
  const headers = withIdempotencyHeader({ "Content-Type": "application/json" }, opts?.idempotencyKey);
  return fetchJson<CreateSaleResponse>(apiUrl("/sales"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function postStockAdjustment(
  payload: StockAdjustmentInput,
  opts?: { idempotencyKey?: string },
): Promise<StockAdjustmentResponse> {
  const headers = withIdempotencyHeader({ "Content-Type": "application/json" }, opts?.idempotencyKey);
  return fetchJson<StockAdjustmentResponse>(apiUrl("/stock/adjustments"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}
