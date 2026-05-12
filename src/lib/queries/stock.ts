"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { postStockAdjustment } from "@/lib/api/offline-requests";
import { apiUrl } from "@/lib/api/version";
import { enqueueOutboxEntry } from "@/lib/offline/outbox";
import { OUTBOX_KIND_STOCK_ADJUSTMENT } from "@/lib/offline/outbox-kinds";
import { OfflineQueuedError } from "@/lib/offline/offline-queued-error";
import { isLikelyNetworkError } from "@/lib/offline/network-error";
import type { StockAdjustmentInput } from "@/lib/validation/stock";

export const stockDashboardQueryKey = ["stock", "dashboard"] as const;
export const stockCatalogQueryKey = ["stock", "catalog"] as const;
export const stockProductSuggestQueryKey = ["stock", "products", "suggest"] as const;
export const stockProductDetailQueryKey = ["stock", "products", "detail"] as const;
export const stockProductBatchesQueryKey = ["stock", "products", "batches"] as const;
export const stockBranchesQueryKey = ["stock", "branches"] as const;
export const stockBatchDetailQueryKey = ["stock", "batch"] as const;

export type StockBatchDetailResponse = {
  id: string;
  productId: string;
  batchNumber: string;
  purchaseOrderNumber: string | null;
  productName: string;
  sku: string;
  categoryName: string;
  supplierName: string | null;
  branchId: string;
  branchName: string;
  receivedAt: string;
  manufacturedAt: string | null;
  expiresAt: string;
  quantityReceived: number;
  quantityAvailable: number;
  unitOrderPriceCents: number;
  unitSalePriceCents: number | null;
  status: string;
  notes: string | null;
  daysToExpiry: number;
  stockProgressPercent: number;
  canDispose: boolean;
  transactions: Array<{
    id: string;
    occurredAt: string;
    transactionType: string;
    quantityDelta: number;
    performedByName: string | null;
    referenceType: string | null;
    referenceId: string | null;
    note: string | null;
  }>;
};

type StockBranch = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type StockDashboardResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: StockBranch[];
  lastSyncedAt: string;
  filters: {
    search: string;
    view: "all" | "expiring";
    inventoryStatus: "all" | "out_of_stock" | "reorder_attention";
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  metrics: {
    totalStockValueCents: number;
    totalAvailableUnits: number;
    totalBatchCount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
    outOfStockSkuCount: number;
    lowStockSkuCount: number;
    reorderSuggestedCount: number;
    stockTurnoverRate: number;
    healthyBatchRatio: number;
    unitsSoldLast30Days: number;
  };
  inventory: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    branchName: string;
    categoryName: string;
    supplierName: string | null;
    batchNumber: string;
    expiresAt: string;
    daysToExpiry: number;
    quantityAvailable: number;
    quantityReceived: number;
    stockProgressPercent: number;
    unitOrderPriceCents: number;
    unitSalePriceCents: number | null;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    canDispose: boolean;
  }>;
  recentEntries: Array<{
    id: string;
    productName: string;
    batchNumber: string;
    quantityReceived: number;
    createdAt: string;
  }>;
  draftOrder: {
    branchName: string;
    productCount: number;
    products: string[];
  };
};

export type StockCatalogResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: StockBranch[];
  suppliers: Array<{
    id: string;
    name: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    categoryName: string;
    defaultSellingPriceCents: number;
  }>;
  recentEntries: StockDashboardResponse["recentEntries"];
};

export type CreateStockBatchPayload = {
  branchId?: string;
  productName: string;
  productBarcode?: string;
  batchNumber: string;
  expiresAt: string;
  quantityReceived: number;
  unitOrderPrice: number;
  supplierName?: string;
  categoryName?: string;
  purchaseOrderNumber?: string;
  unitSellingPrice: number;
  notes?: string;
};

export type CreateStockBatchResult =
  | { ok: true; data: { id: string; batchNumber: string; productName: string } }
  | { ok: false; error: string };

export type StockAdjustmentPayload = {
  branchId?: string;
  batchIds: string[];
  quantityDelta: number;
  note?: string;
};

export type StockAdjustmentMutationInput = StockAdjustmentPayload & { idempotencyKey?: string };

function toErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Request failed.";
}


type StockDashboardQueryOptions = {
  branchId?: string;
  search: string;
  view: "all" | "expiring";
  inventoryStatus: "all" | "out_of_stock" | "reorder_attention";
  page: number;
  pageSize?: number;
  enabled?: boolean;
};

type StockCatalogQueryOptions = {
  branchId?: string;
  /** Omit full product list; use suggest endpoint for autocomplete. */
  includeProducts?: boolean;
  suppressGlobalLoading?: boolean;
};

export type StockProductSuggestResponse = {
  products: StockCatalogResponse["products"];
};

export type StockProductDetailResponse = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string;
  defaultSellingPriceCents: number;
  status: "active" | "discontinued";
};

export type StockBranchesResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: StockBranch[];
};

export type StockProductBatchesResponse = {
  branchId: string;
  batches: Array<{
    id: string;
    batchNumber: string;
    expiresAt: string;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    quantityAvailable: number;
    receivedAt: string;
  }>;
};

export type UpdateStockBatchPayload = {
  branchId?: string;
  expiresAt?: string;
  batchNumber?: string;
  purchaseOrderNumber?: string | null;
  manufacturedAt?: string | null;
  unitOrderPrice?: number;
  unitSellingPrice?: number;
  notes?: string | null;
  status?: "draft" | "active" | "quarantined" | "expired" | "disposed" | "depleted";
};

export function useStockDashboardQuery({
  branchId,
  search,
  view,
  inventoryStatus,
  page,
  pageSize = 10,
  enabled = true,
}: StockDashboardQueryOptions) {
  return useQuery({
    queryKey: [...stockDashboardQueryKey, { branchId, search, view, inventoryStatus, page, pageSize }],
    queryFn: () =>
      fetchJson<StockDashboardResponse>(
        `${apiUrl("/stock")}?branch=${encodeURIComponent(branchId ?? "")}&search=${encodeURIComponent(search)}&view=${encodeURIComponent(view)}&inventoryStatus=${encodeURIComponent(inventoryStatus)}&page=${page}&pageSize=${pageSize}`,
        { method: "GET" },
      ),
    enabled,
    placeholderData: (previousData) => previousData,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function getStockCatalogQueryOptions({
  branchId,
  includeProducts = true,
  suppressGlobalLoading = false,
}: StockCatalogQueryOptions = {}) {
  const includeProductsParam = includeProducts ? "1" : "0";
  return {
    queryKey: [...stockCatalogQueryKey, { branchId, includeProducts }],
    queryFn: () =>
      fetchJson<StockCatalogResponse>(
        `${apiUrl("/stock/catalog")}?branch=${encodeURIComponent(branchId ?? "")}&includeProducts=${includeProductsParam}`,
        { method: "GET" },
      ),
    staleTime: 60_000,
    meta: suppressGlobalLoading
      ? {
          suppressGlobalLoading: true,
        }
      : undefined,
  } as const;
}

export function prefetchStockCatalog(queryClient: QueryClient, options: StockCatalogQueryOptions = {}) {
  return queryClient.prefetchQuery(getStockCatalogQueryOptions(options));
}

export function useStockCatalogQuery(options: StockCatalogQueryOptions = {}) {
  return useQuery(getStockCatalogQueryOptions(options));
}

export function useStockProductSuggestQuery(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: [...stockProductSuggestQueryKey, trimmed],
    queryFn: () =>
      fetchJson<StockProductSuggestResponse>(
        `${apiUrl("/stock/products/suggest")}?q=${encodeURIComponent(trimmed)}`,
        { method: "GET" },
      ),
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useStockProductQuery(productId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...stockProductDetailQueryKey, productId],
    queryFn: () =>
      fetchJson<StockProductDetailResponse>(`${apiUrl("/stock/products")}/${productId}`, {
        method: "GET",
      }),
    enabled: Boolean(productId) && enabled,
    staleTime: 30_000,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useStockProductBatchesQuery(productId: string | null, branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...stockProductBatchesQueryKey, { productId, branchId }],
    queryFn: () =>
      fetchJson<StockProductBatchesResponse>(
        `${apiUrl("/stock/products")}/${productId}/batches?branch=${encodeURIComponent(branchId ?? "")}`,
        { method: "GET" },
      ),
    enabled: Boolean(productId) && enabled,
    staleTime: 30_000,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useUpdateStockProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      payload,
    }: {
      productId: string;
      payload: {
        name?: string;
        categoryName?: string | null;
        barcode?: string | null;
        defaultSellingPrice?: number;
        status?: "active" | "discontinued";
      };
    }) =>
      fetchJson<StockProductDetailResponse>(`${apiUrl("/stock/products")}/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey, refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: stockProductSuggestQueryKey, refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
        queryClient.invalidateQueries({
          queryKey: [...stockProductDetailQueryKey, variables.productId],
          refetchType: "none",
        }),
      ]);
    },
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useUpdateStockBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      payload,
    }: {
      batchId: string;
      payload: UpdateStockBatchPayload;
    }) =>
      fetchJson<{ id: string; batchNumber: string; productName: string; expiresAt: string }>(
        `${apiUrl("/stock/batches")}/${batchId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey, refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockProductBatchesQueryKey }),
      ]);
    },
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useStockBranchesQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...stockBranchesQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<StockBranchesResponse>(`${apiUrl("/stock/branches")}?branch=${encodeURIComponent(branchId ?? "")}`, {
        method: "GET",
      }),
    enabled,
  });
}

export function useBatchDetailQuery(batchId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...stockBatchDetailQueryKey, batchId],
    queryFn: () =>
      fetchJson<StockBatchDetailResponse>(`${apiUrl("/stock/batches")}/${batchId}`, {
        method: "GET",
      }),
    enabled: Boolean(batchId) && enabled,
  });
}

export function useCreateStockBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockBatchPayload) =>
      fetchJson<{ id: string; batchNumber: string; productName: string }>(apiUrl("/stock/batches"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey });
      void queryClient.invalidateQueries({
        queryKey: stockCatalogQueryKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: stockBranchesQueryKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: stockProductSuggestQueryKey,
        refetchType: "none",
      });
    },
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useCreateStockBatchesMutation(options?: { concurrency?: number }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payloads: CreateStockBatchPayload[]) => {
      try {
        const response = await fetchJson<{
          results: CreateStockBatchResult[];
          okCount: number;
          failCount: number;
        }>(apiUrl("/stock/batches/bulk"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloads),
        });
        return response.results;
      } catch (err) {
        const message = toErrorMessage(err);
        return payloads.map(() => ({ ok: false, error: message }) satisfies CreateStockBatchResult);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey });
      void queryClient.invalidateQueries({
        queryKey: stockCatalogQueryKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: stockBranchesQueryKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: stockProductSuggestQueryKey,
        refetchType: "none",
      });
    },
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useDisposeStockBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      branchId,
      note,
    }: {
      batchId: string;
      branchId?: string;
      note?: string;
    }) =>
      fetchJson<{ id: string; batchNumber: string; productName: string }>(
        `${apiUrl("/stock/batches")}/${batchId}/dispose`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ branchId, note }),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
      ]);
    },
  });
}

export function useRestoreStockBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      branchId,
      note,
    }: {
      batchId: string;
      branchId?: string;
      note?: string;
    }) =>
      fetchJson<{ id: string; batchNumber: string; productName: string; restoredQuantity: number }>(
        `${apiUrl("/stock/batches")}/${batchId}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ branchId, note }),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
      ]);
    },
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StockAdjustmentMutationInput) => {
      const { idempotencyKey: explicitKey, ...payload } = input;
      const idempotencyKey = explicitKey ?? crypto.randomUUID();
      const body = payload as StockAdjustmentInput;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOutboxEntry({
          id: crypto.randomUUID(),
          feature: "stock",
          kind: OUTBOX_KIND_STOCK_ADJUSTMENT,
          payload: body,
          idempotencyKey,
        });
        throw new OfflineQueuedError();
      }

      try {
        return await postStockAdjustment(body, { idempotencyKey });
      } catch (err) {
        if (isLikelyNetworkError(err)) {
          await enqueueOutboxEntry({
            id: crypto.randomUUID(),
            feature: "stock",
            kind: OUTBOX_KIND_STOCK_ADJUSTMENT,
            payload: body,
            idempotencyKey,
          });
          throw new OfflineQueuedError();
        }
        throw err;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBatchDetailQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockProductBatchesQueryKey }),
      ]);
    },
  });
}
