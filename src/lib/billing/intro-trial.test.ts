import { describe, expect, it } from "vitest";
import {
  INTRO_TRIAL_DAYS,
  introPaidTrialEligibleForSnapshot,
  introTrialPeriodEnd,
  isPaidSubscriptionPlanCode,
  normalizeSignupSelectedPlanCode,
} from "@/lib/billing/intro-trial";

describe("introTrialPeriodEnd", () => {
  it("adds INTRO_TRIAL_DAYS to the start instant", () => {
    const start = new Date("2026-01-01T12:00:00.000Z");
    const end = introTrialPeriodEnd(start);
    expect(end.getTime() - start.getTime()).toBe(INTRO_TRIAL_DAYS * 86400000);
  });
});

describe("normalizeSignupSelectedPlanCode", () => {
  it("accepts paid plan codes case-insensitively", () => {
    expect(normalizeSignupSelectedPlanCode("  PRO ")).toBe("pro");
    expect(normalizeSignupSelectedPlanCode("Basic")).toBe("basic");
  });

  it("returns null for free or unknown", () => {
    expect(normalizeSignupSelectedPlanCode("free")).toBeNull();
    expect(normalizeSignupSelectedPlanCode("nope")).toBeNull();
    expect(normalizeSignupSelectedPlanCode(null)).toBeNull();
  });
});

describe("introPaidTrialEligibleForSnapshot", () => {
  it("is true only for active free orgs that have not started intro trial", () => {
    expect(
      introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt: null,
        planCode: "free",
        status: "active",
      }),
    ).toBe(true);
    expect(
      introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt: new Date(),
        planCode: "free",
        status: "active",
      }),
    ).toBe(false);
    expect(
      introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt: null,
        planCode: "basic",
        status: "trialing",
      }),
    ).toBe(false);
    expect(
      introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt: null,
        planCode: "free",
        status: "past_due",
      }),
    ).toBe(false);
  });
});

describe("isPaidSubscriptionPlanCode", () => {
  it("treats free as not paid", () => {
    expect(isPaidSubscriptionPlanCode("free")).toBe(false);
    expect(isPaidSubscriptionPlanCode("basic")).toBe(true);
  });
});
