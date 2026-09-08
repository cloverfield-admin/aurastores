import { describe, expect, it } from "vitest";
import { capabilitiesFromPlan } from "@/lib/billing/entitlements";
import {
  MEMBERSHIP_CAPABILITY_KEYS,
  defaultCapabilitiesForAppRole,
  mergeCapabilitiesFromInput,
} from "@/lib/rbac/capabilities";

describe("financials capability", () => {
  it("keeps the till for a cashier but not the margin", () => {
    const caps = defaultCapabilitiesForAppRole("cashier");
    expect(caps.sales).toBe(true);
    expect(caps.stock).toBe(true);
    expect(caps.financials).toBe(false);
  });

  it("treats a pharmacist like a cashier for money", () => {
    const caps = defaultCapabilitiesForAppRole("pharmacist");
    expect(caps.sales).toBe(true);
    expect(caps.financials).toBe(false);
  });

  it("gives it to the roles answerable for the numbers", () => {
    expect(defaultCapabilitiesForAppRole("manager").financials).toBe(true);
    expect(defaultCapabilitiesForAppRole("analyst").financials).toBe(true);
    expect(defaultCapabilitiesForAppRole("owner").financials).toBe(true);
    expect(defaultCapabilitiesForAppRole("admin").financials).toBe(true);
  });

  it("withholds it from an unknown role", () => {
    expect(defaultCapabilitiesForAppRole("some_new_role").financials).toBe(false);
  });

  // Effective capabilities are membership ∩ plan, and no plan row lists
  // `financials` — it is never sold. Intersecting it would have switched
  // revenue off for every user of every plan, the owner included.
  it("is not gated by the plan", () => {
    const legacyPlan = capabilitiesFromPlan({
      capabilities: { stock: true, sales: true },
      limits: {},
    } as never);

    expect(legacyPlan.financials).toBe(true);
    expect(legacyPlan.pay).toBe(false);
  });

  // A key missing from this list is silently dropped from the membership on
  // the next save from the staff editor.
  it("round-trips through the stored capability set", () => {
    expect(MEMBERSHIP_CAPABILITY_KEYS).toContain("financials");
    expect(mergeCapabilitiesFromInput("cashier", { financials: true }).financials).toBe(true);
  });
});
