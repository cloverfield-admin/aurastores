"use client";

/**
 * Engine-backed hooks for the tenant subscription page (/organization/subscription).
 *
 * Payments here are LENCO ONLY. The engine also exposes Lipila collection routes and
 * a RevenueCat store rail, and `src/lib/queries/billing.ts` still wraps the Lipila
 * ones for the (closed) dashboard portal — do not reach for those from this page.
 * Mobile sells through the app stores; the web console sells through Lenco.
 *
 * Reads and writes go to the Go engine via the same-origin `/api/engine` proxy, so
 * plan activation stays on the one audited path: Lenco collection → webhook →
 * ActivateOrgPlanFromInvoice. Payloads stay snake_case to match the engine's JSON
 * tags (see the note in src/lib/api/engine.ts).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api/engine";
import type { SubscriptionInterval, SubscriptionPlanCode } from "@/lib/queries/billing";

export type EngineSubscription = {
  plan_code: SubscriptionPlanCode;
  plan_name: string;
  interval: SubscriptionInterval;
  status: "active" | "past_due" | "canceled" | "pending_payment" | "trialing";
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  scheduled_plan_code: SubscriptionPlanCode | null;
  intro_paid_trial_eligible: boolean;
};

export type LencoCheckoutResult = {
  invoice_id: string;
  identifier: string;
  reference: string;
  /** Normalized by the engine to pending | successful | failed. */
  status: string;
  message: string;
  amount_cents: number;
  currency: string;
  operator: string;
};

export type EngineInvoice = {
  id: string;
  status: "pending" | "paid" | "failed" | "expired";
  amount_cents: number;
  currency: string;
  interval: SubscriptionInterval;
  identifier: string;
  plan_code: SubscriptionPlanCode;
  plan_name: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export const engineSubscriptionQueryKey = ["engine", "billing", "subscription"] as const;

export function useEngineSubscriptionQuery() {
  return useQuery({
    queryKey: engineSubscriptionQueryKey,
    queryFn: () =>
      adminFetch<{ subscription: EngineSubscription | null }>("/api/v1/billing/subscription").then(
        (d) => d.subscription,
      ),
  });
}

/**
 * Polls one invoice while a Lenco collection is in flight.
 *
 * The customer approves the payment on their handset, and the plan is activated by
 * the Lenco webhook rather than by anything this page does — so the only honest way
 * to know it landed is to watch the invoice flip to `paid`. `enabled` is what starts
 * and stops the polling.
 */
export function useEngineInvoiceQuery(invoiceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["engine", "billing", "invoice", invoiceId],
    queryFn: () =>
      adminFetch<{ invoice: EngineInvoice }>(`/api/v1/billing/invoices/${invoiceId}`).then(
        (d) => d.invoice,
      ),
    enabled: Boolean(invoiceId) && enabled,
    refetchInterval: 3000,
  });
}

export function useStartLencoCheckoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { plan_code: SubscriptionPlanCode; interval: SubscriptionInterval; phone: string }) =>
      adminFetch<LencoCheckoutResult>("/api/v1/billing/lenco/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      // The invoice list changes even before the payment settles.
      await qc.invalidateQueries({ queryKey: engineSubscriptionQueryKey });
    },
  });
}

/**
 * Ends the subscription when the period already paid for runs out, or clears a
 * pending cancellation.
 *
 * This replaced a pair of `/subscription/downgrade` mutations that called an
 * endpoint the engine never implemented. Scheduling a move to a *cheaper paid
 * plan* cannot work on this rail anyway: collections are once-off, so there is
 * no renewal event to apply the change at, and the cheaper plan would not have
 * been paid for. Moving down a tier here means buying the cheaper plan through
 * checkout; stopping altogether means this.
 *
 * Owner-only, enforced by the engine. Nothing is revoked on the spot — the
 * engine's daily sweep moves the org to Free once the period lapses.
 */
export function useSetCancelAtPeriodEndMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cancel: boolean) =>
      adminFetch<{ subscription: EngineSubscription | null }>(
        "/api/v1/billing/subscription/cancel",
        { method: cancel ? "POST" : "DELETE" },
      ).then((d) => d.subscription),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: engineSubscriptionQueryKey }),
        qc.invalidateQueries({ queryKey: ["billing-portal", "me"] }),
      ]);
    },
  });
}

/**
 * Abandons an unpaid payment attempt.
 *
 * Only one invoice per org may be pending, so an attempt the customer never
 * completed — a Lenco prompt they ignored, a mistyped number — used to block
 * every other plan and interval until it was paid. The engine now expires them
 * on a deadline; this is the way out before that deadline arrives.
 *
 * The engine marks the invoice `expired` rather than inventing a `canceled`
 * status, so nothing here has to learn a new state.
 */
export function useCancelInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      adminFetch<{ canceled: boolean }>(`/api/v1/billing/invoices/${invoiceId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: engineSubscriptionQueryKey }),
        qc.invalidateQueries({ queryKey: ["billing-portal"] }),
      ]);
    },
  });
}
