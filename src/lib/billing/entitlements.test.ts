import { describe, expect, it } from "vitest";
import { assertWithinLimit, intersectCapabilities } from "@/lib/billing/entitlements";

describe("intersectCapabilities", () => {
  it("intersects membership and plan capabilities", () => {
    const membership = {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: true,
      pay: true,
      expenses: true,
      organization: true,
    };
    const plan = {
      stock: true,
      sales: true,
      insights: false,
      catalog: true,
      staff: false,
      pay: false,
      expenses: true,
      organization: true,
    };
    expect(intersectCapabilities(membership, plan)).toEqual({
      stock: true,
      sales: true,
      insights: false,
      catalog: true,
      staff: false,
      pay: false,
      expenses: true,
      organization: true,
    });
  });

  it("keeps expenses independent of pay", () => {
    // The Pro plan sells expenses without the Aura Pay wallet, so a plan granting
    // expenses:true / pay:false must survive the intersection with both flags intact.
    const membership = {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: true,
      pay: true,
      expenses: true,
      organization: true,
    };
    const proPlan = {
      stock: true,
      sales: true,
      insights: true,
      catalog: true,
      staff: true,
      pay: false,
      expenses: true,
      organization: true,
    };
    const result = intersectCapabilities(membership, proPlan);
    expect(result.expenses).toBe(true);
    expect(result.pay).toBe(false);
  });
});

describe("assertWithinLimit", () => {
  it("allows unlimited limits", () => {
    expect(() => assertWithinLimit({ kind: "products", current: 999, limit: null })).not.toThrow();
  });

  it("throws when current >= limit", () => {
    expect(() => assertWithinLimit({ kind: "staffUsers", current: 5, limit: 5 })).toThrow(
      /Plan limit reached/i,
    );
  });
});

