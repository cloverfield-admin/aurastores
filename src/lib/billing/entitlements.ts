import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import type { SubscriptionPlanFeatures } from "@/lib/db/schema/billing.schema";

export type PlanEntitlements = SubscriptionPlanFeatures;

export function capabilitiesFromPlan(entitlements: PlanEntitlements): MembershipCapabilities {
  const c = entitlements.capabilities;
  return {
    stock: Boolean(c.stock),
    sales: Boolean(c.sales),
    insights: Boolean(c.insights),
    catalog: Boolean(c.catalog),
    staff: Boolean(c.staff),
    pay: Boolean(c.pay),
    expenses: Boolean(c.expenses),
    organization: Boolean(c.organization),
  };
}

export function intersectCapabilities(
  membership: MembershipCapabilities,
  planCaps: MembershipCapabilities,
): MembershipCapabilities {
  return {
    stock: membership.stock && planCaps.stock,
    sales: membership.sales && planCaps.sales,
    insights: membership.insights && planCaps.insights,
    catalog: membership.catalog && planCaps.catalog,
    staff: membership.staff && planCaps.staff,
    pay: membership.pay && planCaps.pay,
    expenses: membership.expenses && planCaps.expenses,
    organization: membership.organization && planCaps.organization,
  };
}

export function assertWithinLimit(params: {
  kind:
    | "products"
    | "salesTransactions"
    | "categories"
    | "staffUsers"
    | "branches";
  current: number;
  limit: number | null | undefined;
}) {
  const { kind, current, limit } = params;
  if (limit === null || limit === undefined) {
    return;
  }
  if (current >= limit) {
    throw new Error(`Plan limit reached for ${kind}.`);
  }
}

