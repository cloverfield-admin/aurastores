"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

export const stockDashboardQueryKey = ["stock", "dashboard"] as const;
export const stockCatalogQueryKey = ["stock", "catalog"] as const;
export const stockProductSuggestQueryKey = ["stock", "products", "suggest"] as const;
export const stockBranchesQueryKey = ["stock", "branches"] as const;
export const stockBatchDetailQueryKey = ["stock", "batch"] as const;

export type StockBatchDetailResponse = {
  id: string;
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
    productName: string;
    sku: string;
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

export type StockAdjustmentPayload = {
  branchId?: string;
  batchIds: string[];
  quantityDelta: number;
  note?: string;
};

type StockDashboardQueryOptions = {
  branchId?: string;
  search: string;
  view: "all" | "expiring";
  page: number;
  pageSize?: number;
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

export type StockBranchesResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: StockBranch[];
};

export function useStockDashboardQuery({
  branchId,
  search,
  view,
  page,
  pageSize = 10,
}: StockDashboardQueryOptions) {
  return useQuery({
    queryKey: [...stockDashboardQueryKey, { branchId, search, view, page, pageSize }],
    queryFn: () =>
      fetchJson<StockDashboardResponse>(
        `${apiUrl("/stock")}?branch=${encodeURIComponent(branchId ?? "")}&search=${encodeURIComponent(search)}&view=${encodeURIComponent(view)}&page=${page}&pageSize=${pageSize}`,
        { method: "GET" },
      ),
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
    mutationFn: (payload: StockAdjustmentPayload) =>
      fetchJson<{
        adjustedCount: number;
        batchIds: string[];
        productNames: string[];
        updatedBatches: Array<{
          id: string;
          quantityAvailable: number;
          status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
        }>;
      }>(
        apiUrl("/stock/adjustments"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
