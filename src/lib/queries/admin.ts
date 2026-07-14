"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { adminFetch, adminFetchPaged, type EnginePage } from "@/lib/api/engine";

/**
 * Types + hooks for the platform console.
 *
 * Field names are snake_case because that is what the Go engine emits. They are
 * NOT camel-cased on the way in: a transform would turn a renamed engine field
 * into a silent `undefined` instead of a loud failure, and nothing else in the app
 * reads these types.
 */

// --- DTOs ---

export type AdminCounts = {
  users: number;
  users_active: number;
  users_disabled: number;
  users_invited: number;
  users_pending_deletion: number;
  new_users_in_window: number;
  organizations: number;
  organizations_active: number;
  organizations_trial: number;
  organizations_suspended: number;
  organizations_archived: number;
  organizations_pending_deletion: number;
  new_organizations_in_window: number;
};

export type AdminRevenue = {
  mrr_cents: number;
  arr_cents: number;
  mrr_at_risk_cents: number;
  paying_orgs: number;
};

export type AdminPlanMixRow = { plan_code: string; plan_name: string; orgs: number; trialing: number };
export type AdminSubStatusRow = { status: string; orgs: number };

export type AdminInvoiceHealth = {
  paid: number;
  failed: number;
  expired: number;
  pending: number;
  total: number;
  failure_rate: number;
};

export type AdminGmv = { gmv_cents: number; sale_count: number };

export type AdminActiveOrg = {
  id: string;
  display_name: string;
  slug: string;
  status: string;
  plan_code: string;
  sales_count: number;
  gmv_cents: number;
  last_sale_at: string | null;
};

export type AdminOverview = {
  window_days: number;
  counts: AdminCounts;
  revenue: AdminRevenue;
  plan_mix: AdminPlanMixRow[];
  subscription_status: AdminSubStatusRow[];
  invoices: AdminInvoiceHealth;
  gmv: AdminGmv;
  most_active: AdminActiveOrg[];
  expired_trials: number;
};

export type AdminSignupPoint = { day: string; users: number; organizations: number };
export type AdminGmvPoint = { day: string; gmv_cents: number; sale_count: number };

export type AdminOnboardingFunnel = {
  started: number;
  reached_location: number;
  reached_license: number;
  reached_review: number;
  has_branch: number;
  submitted: number;
  approved: number;
  first_sale: number;
};

export type AdminTrialConversion = {
  trials_started: number;
  converted: number;
  ever_paid: number;
};

export type AdminCancellations = {
  canceled: number;
  pending_cancel: number;
  pending_deletion: number;
  suspended: number;
};

export type AdminInactiveOrg = {
  id: string;
  display_name: string;
  slug: string;
  status: string;
  plan_code: string;
  subscription_status: string;
  last_sale_at: string | null;
  days_since_sale: number | null;
};

export type AdminGrowth = {
  window_days: number;
  signups: AdminSignupPoint[];
  gmv: AdminGmvPoint[];
  onboarding_funnel: AdminOnboardingFunnel;
  trial_conversion: AdminTrialConversion;
  cancellations: AdminCancellations;
  inactive_organizations: AdminInactiveOrg[];
};

export type AdminOrgListItem = {
  id: string;
  display_name: string;
  slug: string;
  primary_email: string;
  status: string;
  store_vertical: string;
  plan_code: string;
  subscription_status: string;
  users: number;
  branches: number;
  sales_count_30d: number;
  gmv_cents_30d: number;
  deletion_scheduled_at: string | null;
  created_at: string;
};

export type AdminPagination = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
};

export type AdminOrgList = { items: AdminOrgListItem[]; pagination: AdminPagination };

export type AdminOrgProfile = {
  id: string;
  slug: string;
  display_name: string;
  legal_name: string | null;
  legal_entity_type: string;
  tax_id: string | null;
  primary_email: string;
  primary_phone: string | null;
  hq_address_line_1: string | null;
  hq_address_line_2: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_postal_code: string | null;
  hq_country: string;
  store_vertical: string;
  sales_tax_enabled: boolean;
  sales_tax_rate_bps: number;
  status: string;
};

export type AdminOrgSubscription = {
  plan_code: string;
  plan_name: string;
  interval: string;
  status: string;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  scheduled_plan_code: string | null;
  intro_trial_used: boolean;
  intro_trial_started_at: string | null;
  /** Set by the engine: still `trialing`, but the period has already ended. */
  trial_expired: boolean;
};

export type AdminOrgMember = {
  membership_id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  membership_status: string;
  /** GLOBAL. Disabling this locks the person out of EVERY store they belong to. */
  user_status: string;
  last_login_at: string | null;
  deletion_scheduled_at: string | null;
  joined_at: string | null;
};

export type AdminOrgInvoice = {
  id: string;
  identifier: string;
  plan_code: string;
  interval: string;
  currency: string;
  amount_cents: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type AdminOrgDetail = {
  profile: AdminOrgProfile;
  subscription: AdminOrgSubscription | null;
  members: AdminOrgMember[];
  invoices: AdminOrgInvoice[];
  branches: number;
  products: number;
  sales_count_30d: number;
  gmv_cents_30d: number;
  last_sale_at: string | null;
  deletion_scheduled_at: string | null;
  created_at: string;
};

export type AdminAuditRecord = {
  id: string;
  actor_user_id: string | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_organization_id: string | null;
  target_organization_name: string;
  target_user_id: string | null;
  target_user_email: string;
  summary: string;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  correlation_id: string;
  ip_address: string | null;
  created_at: string;
};

export type AdminPlanPrice = {
  plan_code: string;
  plan_name: string;
  interval: "monthly" | "quarterly" | "yearly";
  currency: string;
  amount_cents: number;
  effective_from: string;
};

// --- query keys ---

export const adminKeys = {
  all: ["admin"] as const,
  overview: (days: number) => ["admin", "overview", days] as const,
  growth: (days: number) => ["admin", "growth", days] as const,
  organizations: (f: AdminOrgFilter) => ["admin", "organizations", f] as const,
  organization: (orgId: string) => ["admin", "organization", orgId] as const,
  audit: (f: AdminAuditFilter) => ["admin", "audit", f] as const,
  planPrices: ["admin", "plan-prices"] as const,
  /**
   * Impersonated reads. The org id is part of the key ON PURPOSE: without it,
   * switching from company A to company B would serve A's cached data under B's
   * name. `removeQueries({queryKey: ["admin","impersonate"]})` clears the scope on
   * exit.
   */
  impersonated: (orgId: string, resource: string) =>
    ["admin", "impersonate", orgId, resource] as const,
};

// --- reads ---

export function useAdminOverviewQuery(days: number) {
  return useQuery({
    queryKey: adminKeys.overview(days),
    queryFn: () => adminFetch<AdminOverview>(`/api/v1/admin/metrics/overview?days=${days}`),
  });
}

export function useAdminGrowthQuery(days: number) {
  return useQuery({
    queryKey: adminKeys.growth(days),
    queryFn: () => adminFetch<AdminGrowth>(`/api/v1/admin/metrics/growth?days=${days}`),
  });
}

export type AdminOrgFilter = {
  q: string;
  status: string;
  plan: string;
  sort: string;
  page: number;
  pageSize: number;
};

export function useAdminOrganizationsQuery(filter: AdminOrgFilter) {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("status", filter.status);
  if (filter.plan) params.set("plan", filter.plan);
  if (filter.sort) params.set("sort", filter.sort);
  params.set("page", String(filter.page));
  params.set("page_size", String(filter.pageSize));

  return useQuery({
    queryKey: adminKeys.organizations(filter),
    queryFn: () => adminFetch<AdminOrgList>(`/api/v1/admin/organizations?${params.toString()}`),
  });
}

export function useAdminOrganizationQuery(orgId: string) {
  return useQuery({
    queryKey: adminKeys.organization(orgId),
    queryFn: () => adminFetch<AdminOrgDetail>(`/api/v1/admin/organizations/${orgId}`),
    enabled: Boolean(orgId),
  });
}

export type AdminAuditFilter = { actor: string; organizationId: string; action: string };

export function useAdminAuditLogQuery(filter: AdminAuditFilter) {
  return useInfiniteQuery({
    queryKey: adminKeys.audit(filter),
    initialPageParam: "",
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filter.actor) params.set("actor", filter.actor);
      if (filter.organizationId) params.set("organization_id", filter.organizationId);
      if (filter.action) params.set("action", filter.action);
      if (pageParam) params.set("cursor", String(pageParam));
      params.set("limit", "25");
      return adminFetchPaged<{ entries: AdminAuditRecord[] }>(
        `/api/v1/admin/audit-log?${params.toString()}`,
      );
    },
    getNextPageParam: (last: { data: { entries: AdminAuditRecord[] }; page: EnginePage | null }) =>
      last.page?.has_more ? (last.page.next_cursor ?? undefined) : undefined,
  });
}

export function useAdminPlanPricesQuery() {
  return useQuery({
    queryKey: adminKeys.planPrices,
    queryFn: () =>
      adminFetch<{ prices: AdminPlanPrice[] }>("/api/v1/admin/plans/prices").then((d) => d.prices),
  });
}

// --- mutations ---

/**
 * Every admin mutation invalidates the WHOLE `admin` scope rather than a single
 * key. Suspending a company changes the overview counts, the revenue snapshot, the
 * companies list and that company's detail page all at once — a targeted
 * invalidation would leave three of the four showing stale numbers.
 */
function useAdminMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
): UseMutationResult<unknown, Error, TVars> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export type AdminOrgPatch = Partial<{
  display_name: string;
  legal_name: string | null;
  legal_entity_type: string;
  tax_id: string | null;
  primary_email: string;
  primary_phone: string | null;
  hq_address_line_1: string | null;
  hq_address_line_2: string | null;
  hq_city: string | null;
  hq_state: string | null;
  hq_postal_code: string | null;
  hq_country: string;
  store_vertical: string;
  sales_tax_enabled: boolean;
  sales_tax_rate_bps: number;
}>;

export function useAdminUpdateOrganizationMutation() {
  return useAdminMutation<{ orgId: string; patch: AdminOrgPatch }>(({ orgId, patch }) =>
    adminFetch(`/api/v1/admin/organizations/${orgId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  );
}

export function useAdminSetOrgStatusMutation() {
  return useAdminMutation<{ orgId: string; status: string }>(({ orgId, status }) =>
    adminFetch(`/api/v1/admin/organizations/${orgId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  );
}

export type AdminSubscriptionCommand =
  | { action: "set_plan"; plan_code: string; interval: string }
  | { action: "grant_trial"; plan_code?: string; days?: number }
  | { action: "extend_trial"; days: number }
  | { action: "cancel"; at_period_end: boolean };

export function useAdminSubscriptionMutation() {
  return useAdminMutation<{ orgId: string; command: AdminSubscriptionCommand }>(
    ({ orgId, command }) =>
      adminFetch(`/api/v1/admin/organizations/${orgId}/subscription`, {
        method: "POST",
        body: JSON.stringify(command),
      }),
  );
}

export function useAdminScheduleOrgDeletionMutation() {
  return useAdminMutation<{ orgId: string }>(({ orgId }) =>
    adminFetch<{ deletion_scheduled_at: string }>(`/api/v1/admin/organizations/${orgId}/deletion`, {
      method: "POST",
    }),
  );
}

export function useAdminCancelOrgDeletionMutation() {
  return useAdminMutation<{ orgId: string }>(({ orgId }) =>
    adminFetch(`/api/v1/admin/organizations/${orgId}/deletion`, { method: "DELETE" }),
  );
}

/** GLOBAL: locks the person out of every store they belong to. */
export function useAdminSetUserStatusMutation() {
  return useAdminMutation<{ orgId: string; userId: string; status: "active" | "disabled" }>(
    ({ orgId, userId, status }) =>
      adminFetch(`/api/v1/admin/organizations/${orgId}/users/${userId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
  );
}

/** PER-ORG: revokes access to this store only. Usually what you want. */
export function useAdminSetMembershipStatusMutation() {
  return useAdminMutation<{
    orgId: string;
    membershipId: string;
    status: "active" | "suspended" | "removed";
  }>(({ orgId, membershipId, status }) =>
    adminFetch(`/api/v1/admin/organizations/${orgId}/memberships/${membershipId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  );
}

export function useAdminUpsertPlanPriceMutation() {
  return useAdminMutation<{
    plan_code: string;
    interval: string;
    currency: string;
    amount_cents: number;
  }>((body) =>
    adminFetch("/api/v1/admin/plans/prices", { method: "POST", body: JSON.stringify(body) }),
  );
}

export function useAdminStartImpersonationMutation() {
  return useMutation({
    mutationFn: ({ orgId }: { orgId: string }) =>
      adminFetch<{ organization: AdminOrgProfile }>(
        `/api/v1/admin/impersonation/${orgId}/start`,
        { method: "POST" },
      ).then((d) => d.organization),
  });
}
