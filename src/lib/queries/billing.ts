"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";

export type SubscriptionInterval = "monthly" | "quarterly" | "yearly";
export type SubscriptionPlanCode = "free" | "basic" | "pro" | "enterprise";

export type SubscriptionPlanFeatures = {
  capabilities: {
    stock: boolean;
    sales: boolean;
    catalog: boolean;
    insights: boolean;
    pay: boolean;
    staff: boolean;
    organization: boolean;
  };
  limits: {
    products: number | null;
    salesTransactions: number | null;
    categories: number | null;
    staffUsers: number | null;
    branches: number | null;
  };
};

export type PublicPlan = {
  code: SubscriptionPlanCode;
  name: string;
  sortOrder: number;
  features: SubscriptionPlanFeatures;
  prices: Partial<Record<SubscriptionInterval, { amountCents: number; currency: string }>>;
};

export type PublicPlansResponse = {
  currency: string;
  plans: PublicPlan[];
};

export type OrgSubscriptionSnapshot = {
  planCode: SubscriptionPlanCode;
  planName: string;
  interval: SubscriptionInterval;
  status: "active" | "past_due" | "canceled" | "pending_payment";
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanCode: SubscriptionPlanCode | null;
};

export type MeBillingResponse = {
  capabilities: Record<string, boolean>;
  role: string;
  entitlements?: { limits?: SubscriptionPlanFeatures["limits"] };
  subscription?: OrgSubscriptionSnapshot | null;
  usage?: {
    products?: number;
    categories?: number;
    salesTransactions?: number;
  };
};

export type InvoiceRow = {
  id: string;
  status: "pending" | "paid" | "failed" | "expired";
  amountCents: number;
  currency: string;
  interval: SubscriptionInterval;
  identifier: string;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  planCode: SubscriptionPlanCode;
  planName: string;
};

export type ListInvoicesResponse = {
  invoices: InvoiceRow[];
  limit: number;
};

export type CreateInvoiceResponse = {
  invoice: {
    id: string;
    identifier: string;
    status: "pending" | "paid" | "failed" | "expired";
    amountCents: number;
    currency: string;
    interval: SubscriptionInterval;
    dueAt: string | null;
    createdAt: string;
  };
};

export type StartLipilaPaymentResponse = {
  invoiceId: string;
  identifier: string;
  currency: string;
  amountCents: number;
  ussdDial: string;
  instructions: string;
};

export type StartLipilaMomoCollectionResponse = {
  invoiceId: string;
  identifier: string;
  referenceId: string | null;
  status: string;
  message: string;
  raw?: unknown;
};

export type StartLipilaCardCollectionResponse = {
  invoiceId: string;
  identifier: string;
  referenceId: string | null;
  checkoutUrl: string | null;
  clientSecret: string | null;
  message: string;
  raw?: unknown;
};

export type LipilaCollectionStatusResponse = {
  status: {
    referenceId?: string;
    currency?: string;
    amount?: number;
    accountNumber?: string;
    status?: string;
    paymentType?: string;
    type?: string;
    ipAddress?: string;
    identifier?: string;
    externalId?: string;
    message?: string;
  };
};

export const publicPlansQueryKey = ["public-plans"] as const;
export const billingInvoicesQueryKey = ["billing", "invoices"] as const;
export const billingMeQueryKey = ["billing", "me"] as const;

export function useBillingMeQuery() {
  return useQuery({
    queryKey: billingMeQueryKey,
    queryFn: () => fetchJson<MeBillingResponse>(apiUrl("/me"), { method: "GET" }),
  });
}

export function usePublicPlansQuery(currency: string) {
  return useQuery({
    queryKey: [...publicPlansQueryKey, currency],
    queryFn: () =>
      fetchJson<PublicPlansResponse>(`/api/public/plans?currency=${encodeURIComponent(currency)}`, {
        method: "GET",
      }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBillingInvoicesQuery(limit = 25) {
  return useQuery({
    queryKey: [...billingInvoicesQueryKey, limit],
    queryFn: () =>
      fetchJson<ListInvoicesResponse>(apiUrl(`/billing/invoices?limit=${encodeURIComponent(String(limit))}`), {
        method: "GET",
      }),
  });
}

export function useCreateInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { planCode: SubscriptionPlanCode; interval: SubscriptionInterval }) =>
      fetchJson<CreateInvoiceResponse>(apiUrl("/billing/invoices"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: billingInvoicesQueryKey });
      await qc.invalidateQueries({ queryKey: billingMeQueryKey });
    },
  });
}

export function useStartLipilaPaymentMutation() {
  return useMutation({
    mutationFn: (body: { invoiceId: string }) =>
      fetchJson<StartLipilaPaymentResponse>(apiUrl("/billing/lipila/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useStartLipilaMomoCollectionMutation() {
  return useMutation({
    mutationFn: (body: { invoiceId: string; msisdn: string; network?: string }) =>
      fetchJson<StartLipilaMomoCollectionResponse>(apiUrl("/billing/lipila/collections/momo/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useStartLipilaCardCollectionMutation() {
  return useMutation({
    mutationFn: (body: { invoiceId: string; returnUrl?: string }) =>
      fetchJson<StartLipilaCardCollectionResponse>(apiUrl("/billing/lipila/collections/card/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
  });
}

export function useCheckLipilaCollectionStatusMutation() {
  return useMutation({
    mutationFn: (params: { referenceId: string }) =>
      fetchJson<LipilaCollectionStatusResponse>(
        apiUrl(`/billing/lipila/collections/status?referenceId=${encodeURIComponent(params.referenceId)}`),
        { method: "GET" },
      ),
  });
}

