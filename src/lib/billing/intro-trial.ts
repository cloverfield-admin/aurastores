import type { SubscriptionPlanCode } from "@/lib/repositories/billing/billing.repository";

export const INTRO_TRIAL_DAYS = 7;

/**
 * Plan trialled for stores that didn't pick a paid plan at signup (i.e. free
 * signups — the mobile app collects no plan choice). `pro` is the top self-serve
 * tier, so a new store sees the whole product for a week before settling back to
 * whatever plan it's actually on.
 *
 * (This was once justified as "the lowest tier including `insights`, which powers
 * the home dashboard". The dashboard is gated on `financials` now, which every
 * plan holds — the trial is purely a taste of Pro, not a workaround.)
 */
export const DEFAULT_INTRO_TRIAL_PLAN_CODE: SubscriptionPlanCode = "pro";

const MS_PER_DAY = 86400000;

export function introTrialPeriodEnd(start: Date): Date {
  return new Date(start.getTime() + INTRO_TRIAL_DAYS * MS_PER_DAY);
}

export function introPaidTrialEligibleForSnapshot(params: {
  paidIntroTrialStartedAt: Date | null | undefined;
  planCode: string;
  status: string;
}): boolean {
  if (params.paidIntroTrialStartedAt) {
    return false;
  }
  if (params.planCode !== "free") {
    return false;
  }
  if (params.status !== "active") {
    return false;
  }
  return true;
}

export function normalizeSignupSelectedPlanCode(raw: string | null | undefined): SubscriptionPlanCode | null {
  if (!raw) {
    return null;
  }
  const c = raw.trim().toLowerCase();
  if (c === "basic" || c === "pro" || c === "enterprise") {
    return c;
  }
  return null;
}

export function isPaidSubscriptionPlanCode(code: SubscriptionPlanCode): boolean {
  return code !== "free";
}
