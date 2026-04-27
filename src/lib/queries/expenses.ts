"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

export const expensesDashboardQueryKey = ["expenses", "dashboard"] as const;

export type ExpensesDateRangeInput = {
  start: string;
  end: string;
};

export type ExpenseType = "general" | "restocking" | "charge";
export type ExpenseChargeType = "momo_sale_fee" | "wallet_withdrawal_fee";

export type ExpensesDashboardResponse = {
  branch: { id: string; name: string };
  branches: Array<{ id: string; name: string; isPrimary: boolean }>;
  totals: {
    totalCents: number;
    byType: Record<ExpenseType, number>;
  };
  series: Array<{
    date: string;
    totalCents: number;
    generalCents: number;
    restockingCents: number;
    chargeCents: number;
  }>;
  expenses: Array<{
    id: string;
    expenseType: ExpenseType;
    chargeType: ExpenseChargeType | null;
    amountCents: number;
    currency: string;
    description: string;
    expenseDate: string;
    sourceRef: string | null;
    createdAt: string;
  }>;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type CreateExpensePayload = {
  branchId?: string;
  expenseType: "general" | "restocking";
  amountCents: number;
  currency?: string;
  description: string;
  expenseDate: string; // YYYY-MM-DD
};

export function useExpensesDashboardQuery(
  branchId?: string,
  enabled = true,
  range?: ExpensesDateRangeInput,
  type?: ExpenseType,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: [...expensesDashboardQueryKey, { branchId, range, type, page, pageSize }],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("branch", branchId ?? "");
      if (range?.start && range?.end) {
        params.set("start", range.start);
        params.set("end", range.end);
      }
      if (type) {
        params.set("type", type);
      }
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      return fetchJson<ExpensesDashboardResponse>(`${apiUrl("/expenses")}?${params.toString()}`, { method: "GET" });
    },
    enabled,
  });
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);
      try {
        return await fetchJson<{ id: string }>(apiUrl("/expenses"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: expensesDashboardQueryKey });
    },
  });
}

