"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";

export const stockDashboardQueryKey = ["stock", "dashboard"] as const;
export const stockCatalogQueryKey = ["stock", "catalog"] as const;
export const stockBranchesQueryKey = ["stock", "branches"] as const;

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
    unitCostCents: number;
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
    categoryName: string;
    defaultSellingPriceCents: number;
  }>;
  recentEntries: StockDashboardResponse["recentEntries"];
};

export type CreateStockBatchPayload = {
  branchId?: string;
  productName: string;
  batchNumber: string;
  expiresAt: string;
  quantityReceived: number;
  unitCost: number;
  supplierName?: string;
  categoryName?: string;
  purchaseOrderNumber?: string;
  unitSalePrice?: number;
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
        `/api/stock?branch=${encodeURIComponent(branchId ?? "")}&search=${encodeURIComponent(search)}&view=${encodeURIComponent(view)}&page=${page}&pageSize=${pageSize}`,
        { method: "GET" },
      ),
    placeholderData: (previousData) => previousData,
  });
}

export function useStockCatalogQuery({ branchId }: StockCatalogQueryOptions = {}) {
  return useQuery({
    queryKey: [...stockCatalogQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<StockCatalogResponse>(`/api/stock/catalog?branch=${encodeURIComponent(branchId ?? "")}`, {
        method: "GET",
      }),
  });
}

export function useStockBranchesQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...stockBranchesQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<StockBranchesResponse>(`/api/stock/branches?branch=${encodeURIComponent(branchId ?? "")}`, {
        method: "GET",
      }),
    enabled,
  });
}

export function useCreateStockBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStockBatchPayload) =>
      fetchJson<{ id: string; batchNumber: string; productName: string }>("/api/stock/batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: stockBranchesQueryKey }),
      ]);
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
        `/api/stock/batches/${batchId}/dispose`,
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
      ]);
    },
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StockAdjustmentPayload) =>
      fetchJson<{ adjustedCount: number; batchIds: string[]; productNames: string[] }>(
        "/api/stock/adjustments",
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
      ]);
    },
  });
}
