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
      organization: true,
    };
    const plan = {
      stock: true,
      sales: true,
      insights: false,
      catalog: true,
      staff: false,
      pay: false,
      organization: true,
    };
    expect(intersectCapabilities(membership, plan)).toEqual({
      stock: true,
      sales: true,
      insights: false,
      catalog: true,
      staff: false,
      pay: false,
      organization: true,
    });
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

