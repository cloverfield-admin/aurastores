"use client";

/**
 * Engine-backed hooks for the web billing portal (`/billing/*`).
 *
 * Everything here goes to the Go engine through the same-origin `/api/engine`
 * proxy, forwarding the caller's own Supabase bearer token — the same path the
 * tenant subscription page uses. Payments are LENCO: the collection is started
 * server-side and the plan is activated by the Lenco webhook, so this layer only
 * ever starts a collection and then watches the invoice.
 *
 * Payloads stay snake_case to match the engine's JSON tags.
 */

import { useQuery } from "@tanstack/react-query";
import { adminFetch, EngineApiError } from "@/lib/api/engine";
import type { SubscriptionInterval, SubscriptionPlanCode } from "@/lib/queries/billing";

export type BillingMe = {
  user: { id: string; email: string; full_name: string | null; avatar_url: string | null };
  role: string;
  organization: { id: string; name: string; hq_country: string };
  subscription: {
    plan_code: SubscriptionPlanCode;
    plan_name: string;
    interval: SubscriptionInterval;
    status: "active" | "past_due" | "canceled" | "pending_payment" | "trialing";
    current_period_start: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    intro_paid_trial_eligible: boolean;
  } | null;
  allowed_branch_ids: string[] | null;
};

export const billingMeQueryKey = ["billing-portal", "me"] as const;

/**
 * Who is signed in, what they may do, and what plan the organization is on.
 * The role here drives the UI; the authoritative gate is the sign-in route and,
 * for every write, the engine itself.
 */
export function useBillingMeQuery() {
  return useQuery({
    queryKey: billingMeQueryKey,
    queryFn: () => adminFetch<BillingMe>("/api/v1/me"),
    staleTime: 30_000,
  });
}

// Cancellation lives with the other engine-backed subscription mutations; it is
// re-exported so the portal keeps a single import surface.
export { useSetCancelAtPeriodEndMutation } from "@/lib/queries/subscription";

export type BillingBranch = { id: string; name: string };

export const billingBranchesQueryKey = ["billing-portal", "branches"] as const;

/**
 * Branch count for the "org · N branches" line.
 *
 * The organization endpoint requires the `organization` capability, which owners
 * have and managers do not — so this is best-effort by design. A 403 resolves to
 * null and the count is simply omitted rather than guessed at from the caller's
 * own branch scope, which would under-report for a manager.
 */
export function useBillingBranchCountQuery(enabled: boolean) {
  return useQuery({
    queryKey: billingBranchesQueryKey,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      try {
        const data = await adminFetch<{ branches: BillingBranch[] }>(
          "/api/v1/dashboard/organization",
        );
        return data.branches?.length ?? null;
      } catch (error) {
        if (error instanceof EngineApiError && (error.status === 403 || error.status === 404)) {
          return null;
        }
        throw error;
      }
    },
  });
}

export type BillingInvoice = {
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
  /** How it was paid. Null on invoices raised before the engine recorded this. */
  payment_method: string | null;
  payment_operator: string | null;
  payment_account_masked: string | null;
};

export const billingInvoicesQueryKey = ["billing-portal", "invoices"] as const;

/** Payment history. The engine returns newest first. */
export function useBillingInvoiceHistoryQuery(limit = 25) {
  return useQuery({
    queryKey: [...billingInvoicesQueryKey, limit],
    queryFn: () =>
      adminFetch<{ invoices: BillingInvoice[] }>(`/api/v1/billing/invoices?limit=${limit}`).then(
        (d) => d.invoices ?? [],
      ),
  });
}
