"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { postCreateSale } from "@/lib/api/offline-requests";
import { apiUrl } from "@/lib/api/version";
import { enqueueOutboxEntry } from "@/lib/offline/outbox";
import { OUTBOX_KIND_SALE_CREATE } from "@/lib/offline/outbox-kinds";
import { OfflineQueuedError } from "@/lib/offline/offline-queued-error";
import { isLikelyNetworkError } from "@/lib/offline/network-error";
import { appMeQueryKey } from "@/lib/queries/staff";
import type { CreateSaleInput } from "@/lib/validation/sales";

export const salesDashboardQueryKey = ["sales", "dashboard"] as const;
export const salesCatalogQueryKey = ["sales", "catalog"] as const;
export const salesRecentQueryKey = ["sales", "recent"] as const;

export type SalesDateRangeInput = {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
};

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
    totalCogsCents: number;
    previousCogsCents: number;
    totalExpensesCents: number;
    previousExpensesCents: number;
    totalChargeExpensesCents: number;
    previousChargeExpensesCents: number;
    grossProfitBeforeExpensesCents: number;
    previousGrossProfitBeforeExpensesCents: number;
    grossProfitCents: number;
    previousGrossProfitCents: number;
    totalSalesCount: number;
    averageOrderValueCents: number;
    unitsSoldLast30Days: number;
    previousUnitsSoldLast30Days: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    amountCents: number;
    pct: number;
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

export type SalesRecentSalesResponse = {
  recentSales: Array<{
    id: string;
    saleNumber: string;
    patientName: string | null;
    createdAt: string;
    totalCents: number;
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
  paymentMethod: "aura-pay" | "card" | "mobile-money" | "cash" | "insurance" | "bank-transfer";
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

export type CreateSaleMutationInput = CreateSalePayload & { idempotencyKey?: string };

export type LipilaFeeBreakdown = {
  grossAmountCents: number;
  feeCents: number;
  netAmountCents: number;
  feeBps: number;
  feePayer: "merchant" | "customer" | "wallet";
};

export type StartSaleMobileMoneyResponse = {
  saleId: string;
  saleNumber: string;
  paymentId: string;
  referenceId: string;
  status: "pending" | "successful" | "failed";
  message: string | null;
  fee: LipilaFeeBreakdown;
};

export type SaleMobileMoneyStatusResponse = {
  referenceId: string;
  status: "pending" | "successful" | "failed";
  message: string | null;
};

export function useSalesDashboardQuery(branchId?: string, enabled = true, range?: SalesDateRangeInput) {
  return useQuery({
    queryKey: [...salesDashboardQueryKey, { branchId, start: range?.start, end: range?.end }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("branch", branchId ?? "");
      if (range?.start && range?.end) {
        params.set("start", range.start);
        params.set("end", range.end);
      }
      return fetchJson<SalesDashboardResponse>(`${apiUrl("/sales")}?${params.toString()}`, {
        method: "GET",
      });
    },
    enabled,
  });
}

export function useSalesRecentSalesQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesRecentQueryKey, { branchId }],
    queryFn: () =>
      fetchJson<SalesRecentSalesResponse>(`${apiUrl("/sales/recent")}?branch=${encodeURIComponent(branchId ?? "")}`, {
        method: "GET",
      }),
    enabled,
  });
}

export function useSalesCatalogQuery(branchId?: string, enabled = true) {
  return useQuery({
    queryKey: [...salesCatalogQueryKey, { branchId }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("branch", branchId ?? "");
      return fetchJson<SalesCatalogResponse>(`${apiUrl("/sales/catalog")}?${params.toString()}`, {
        method: "GET",
      });
    },
    enabled,
  });
}

export function useSalesCatalogSearchQuery(branchId: string | undefined, q: string, enabled = true) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: [...salesCatalogQueryKey, { branchId, q: trimmed }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("branch", branchId ?? "");
      params.set("q", trimmed);
      return fetchJson<SalesCatalogResponse>(`${apiUrl("/sales/catalog")}?${params.toString()}`, {
        method: "GET",
      });
    },
    enabled: enabled && trimmed.length >= 2,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: (previousData) => previousData,
    meta: {
      suppressGlobalLoading: true,
    },
  });
}

export function useCreateSaleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSaleMutationInput) => {
      const { idempotencyKey: explicitKey, ...payload } = input;
      const idempotencyKey = explicitKey ?? crypto.randomUUID();
      const body = payload as CreateSaleInput;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOutboxEntry({
          id: crypto.randomUUID(),
          feature: "sales",
          kind: OUTBOX_KIND_SALE_CREATE,
          payload: body,
          idempotencyKey,
        });
        throw new OfflineQueuedError();
      }

      try {
        return await postCreateSale(body, { idempotencyKey });
      } catch (err) {
        if (isLikelyNetworkError(err)) {
          await enqueueOutboxEntry({
            id: crypto.randomUUID(),
            feature: "sales",
            kind: OUTBOX_KIND_SALE_CREATE,
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
        queryClient.invalidateQueries({ queryKey: salesDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["stock", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: appMeQueryKey }),
      ]);
    },
  });
}

export function useStartSaleMobileMoneyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sale: CreateSalePayload; mobileMoneyNumber: string; customerPaysLipilaFee: boolean; idempotencyKey?: string }) => {
      const { idempotencyKey: explicitKey, ...payload } = input;
      const idempotencyKey = explicitKey ?? crypto.randomUUID();
      return fetchJson<StartSaleMobileMoneyResponse>(apiUrl("/sales/mobile-money/start"), {
        method: "POST",
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: salesDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["stock", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: appMeQueryKey }),
      ]);
    },
  });
}

export async function getSaleMobileMoneyStatus(referenceId: string) {
  const params = new URLSearchParams({ referenceId });
  return fetchJson<SaleMobileMoneyStatusResponse>(`${apiUrl("/sales/mobile-money/status")}?${params.toString()}`, {
    method: "GET",
  });
}
