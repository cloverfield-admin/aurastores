"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

export const salesDashboardQueryKey = ["sales", "dashboard"] as const;
export const salesCatalogQueryKey = ["sales", "catalog"] as const;

type SalesBranch = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type SalesDashboardResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: SalesBranch[];
  metrics: {
    totalRevenueCents: number;
    previousRevenueCents: number;
    totalSalesCount: number;
    averageOrderValueCents: number;
    unitsSoldLast30Days: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    amountCents: number;
    pct: number;
  }>;
  recentSales: Array<{
    id: string;
    saleNumber: string;
    patientName: string | null;
    createdAt: string;
    totalCents: number;
  }>;
  branchDistribution: Array<{
    branchId: string;
    name: string;
    amountCents: number;
    pct: number;
  }>;
  trend: Array<{
    label: string;
    revenueCents: number;
    unitsSold: number;
  }>;
};

export type SalesCatalogResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: SalesBranch[];
  products: Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    categoryName: string;
    defaultSellingPriceCents: number;
    batches: Array<{
      id: string;
      batchNumber: string;
      expiresAt: string;
      quantityAvailable: number;
    }>;
  }>;
};

export type CreateSalePayload = {
  branchId?: string;
  customerName?: string;
  patientCode?: string;
  mobile?: string;
  paymentMethod: "aura-pay" | "card" | "cash" | "insurance" | "bank-transfer";
  paymentReference?: string;
  discountCode?: string;
  notes?: string;
  status: "draft" | "completed";
  items: Array<{
    productId: string;
    batchId?: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  }>;
};

export function useSalesDashboardQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesDashboardQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<SalesDashboardResponse>(`${apiUrl("/sales")}?branch=${encodeURIComponent(branchId ?? "")}`, {
        method: "GET",
      }),
    enabled,
  });
}

export function useSalesCatalogQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesCatalogQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<SalesCatalogResponse>(
        `${apiUrl("/sales/catalog")}?branch=${encodeURIComponent(branchId ?? "")}`,
        {
          method: "GET",
        },
      ),
    enabled,
  });
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSalePayload) =>
      fetchJson<{ id: string; saleNumber: string; status: string; totalCents: number }>(apiUrl("/sales"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["stock", "dashboard"] }),
      ]);
    },
  });
}
