"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import { appMeQueryKey } from "@/lib/queries/staff";
import {
  salesCatalogQueryKey,
  salesDashboardQueryKey,
  salesDetailQueryKey,
  salesRecentQueryKey,
  salesSoldItemsQueryKey,
} from "@/lib/queries/sales";

export const payDashboardQueryKey = ["pay", "dashboard"] as const;
export const payTransactionQueryKey = ["pay", "transaction"] as const;

export type PayDateRangeInput = {
  start: string;
  end: string;
};

export type PayPaymentMethod =
  | "aura_pay_wallet"
  | "card"
  | "mobile_money"
  | "cash"
  | "insurance"
  | "bank_transfer";

export type PayWallet = {
  id: string;
  branchId: string;
  currency: string;
  balanceCents: number;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
} | null;

export type PayDashboardResponse = {
  branch: {
    id: string;
    name: string;
  };
  branches: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>;
  wallet: PayWallet;
  balance: {
    availableCents: number;
    pendingWithdrawalsCents: number;
    lifetimeSettlementsCents: number;
  };
  metrics: {
    totalAmountCents: number;
    totalCount: number;
    averageTransactionCents: number;
    byMethod: Array<{
      method: PayPaymentMethod;
      count: number;
      amountCents: number;
    }>;
  };
  transactions: Array<{
    id: string;
    saleId: string;
    saleNumber: string;
    patientName: string | null;
    method: PayPaymentMethod;
    status: string;
    reference: string | null;
    amountCents: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
    itemCount: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PayTransactionDetailResponse = {
  payment: {
    id: string;
    saleId: string;
    saleNumber: string;
    method: PayPaymentMethod;
    status: string;
    reference: string | null;
    amountCents: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
  };
  sale: {
    id: string;
    saleNumber: string;
    patientName: string | null;
    patientPhone: string | null;
    servedByName: string | null;
    subtotalCents: number;
    taxCents: number;
    discountCents: number;
    totalCents: number;
    completedAt: string | null;
    createdAt: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    productName: string | null;
  }>;
};

export type DeletePayTransactionResponse = {
  id: string;
  saleId: string;
  saleNumber: string;
  restoredItemCount: number;
};

export function usePayDashboardQuery(
  branchId?: string,
  enabled = true,
  range?: PayDateRangeInput,
  method?: PayPaymentMethod,
  page = 1,
  pageSize = 10,
) {
  return useQuery({
    queryKey: [...payDashboardQueryKey, { branchId, start: range?.start, end: range?.end, method, page, pageSize }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("branch", branchId ?? "");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (range?.start && range?.end) {
        params.set("start", range.start);
        params.set("end", range.end);
      }
      if (method) {
        params.set("method", method);
      }
      return fetchJson<PayDashboardResponse>(`${apiUrl("/pay")}?${params.toString()}`, {
        method: "GET",
      });
    },
    enabled,
  });
}

export function usePayTransactionQuery(paymentId?: string, enabled = true) {
  return useQuery({
    queryKey: [...payTransactionQueryKey, { paymentId }],
    queryFn: () =>
      fetchJson<PayTransactionDetailResponse>(apiUrl(`/pay/transactions/${paymentId}`), {
        method: "GET",
      }),
    enabled: enabled && Boolean(paymentId),
  });
}

export function useDeletePayTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) =>
      fetchJson<DeletePayTransactionResponse>(apiUrl(`/pay/transactions/${encodeURIComponent(paymentId)}`), {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: payDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: payTransactionQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesDashboardQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesRecentQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesDetailQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesSoldItemsQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesCatalogQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["stock", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: appMeQueryKey }),
      ]);
    },
  });
}

export function useActivatePayWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { branchId?: string }) =>
      fetchJson<{ wallet: NonNullable<PayWallet> }>(apiUrl("/pay/wallet/activate"), {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: payDashboardQueryKey });
    },
  });
}

export function useWithdrawPayWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { branchId?: string; amountCents: number; mobileNumber: string; reference?: string }) =>
      fetchJson<{ wallet: NonNullable<PayWallet> }>(apiUrl("/pay/wallet/withdraw"), {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: payDashboardQueryKey });
    },
  });
}
