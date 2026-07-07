import type { SubscriptionPlanFeatures } from "@/lib/db/schema/billing.schema";
import type { SubscriptionPlanCode } from "@/lib/repositories/billing/billing.repository";

/**
 * When DB `limits.salesTransactions` is null (legacy seed), use current product caps.
 * Used for public pricing, auth entitlements (`/me`), and anywhere else that reads plan JSON from the DB.
 */
const MONTHLY_SALES_PUBLIC_FALLBACK: Partial<Record<SubscriptionPlanCode, number>> = {
  free: 10,
  basic: 1000,
};

export function withPublicPlanSalesLimitFallback(
  code: SubscriptionPlanCode,
  features: SubscriptionPlanFeatures,
): SubscriptionPlanFeatures {
  if (features.limits.salesTransactions != null) {
    return features;
  }
  const fallback = MONTHLY_SALES_PUBLIC_FALLBACK[code];
  if (fallback === undefined) {
    return features;
  }
  return {
    ...features,
    limits: {
      ...features.limits,
      salesTransactions: fallback,
    },
  };
}
