import type { SubscriptionPlanCode } from "@/lib/repositories/billing/billing.repository";

export const INTRO_TRIAL_DAYS = 7;

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
