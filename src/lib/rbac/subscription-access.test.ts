import { describe, expect, it } from "vitest";
import { canManageSubscription } from "@/lib/rbac/subscription-access";
import { defaultCapabilitiesForAppRole } from "@/lib/rbac/capabilities";

describe("canManageSubscription", () => {
  it("allows owner, admin and manager", () => {
    expect(canManageSubscription("owner")).toBe(true);
    expect(canManageSubscription("admin")).toBe(true);
    expect(canManageSubscription("manager")).toBe(true);
  });

  it("denies roles that only run the shop floor", () => {
    expect(canManageSubscription("cashier")).toBe(false);
    expect(canManageSubscription("pharmacist")).toBe(false);
    expect(canManageSubscription("analyst")).toBe(false);
    expect(canManageSubscription("")).toBe(false);
  });

  it("is not the `organization` capability", () => {
    // The guard has to be a role check: a manager belongs on the plan page but has
    // no `organization` capability, so gating on that would lock them out. Pinning
    // this here so the two don't get quietly conflated later.
    expect(defaultCapabilitiesForAppRole("manager").organization).toBe(false);
    expect(canManageSubscription("manager")).toBe(true);
  });
});
