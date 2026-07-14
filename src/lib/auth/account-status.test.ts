import { describe, expect, it } from "vitest";
import { accountStatusBlock } from "@/lib/auth/account-status";

const healthy = {
  userStatus: "active",
  organizationStatus: "active",
  membershipStatus: "active",
  isPlatformAdmin: false,
};

describe("accountStatusBlock", () => {
  it("allows a healthy account", () => {
    expect(accountStatusBlock(healthy)).toBeNull();
    expect(accountStatusBlock({ ...healthy, organizationStatus: "trial" })).toBeNull();
  });

  it("blocks a disabled user, a suspended/archived org, and a revoked membership", () => {
    expect(accountStatusBlock({ ...healthy, userStatus: "disabled" })).toBe("account_disabled");
    expect(accountStatusBlock({ ...healthy, organizationStatus: "suspended" })).toBe(
      "organization_suspended",
    );
    expect(accountStatusBlock({ ...healthy, organizationStatus: "archived" })).toBe(
      "organization_archived",
    );
    expect(accountStatusBlock({ ...healthy, membershipStatus: "suspended" })).toBe(
      "membership_suspended",
    );
    expect(accountStatusBlock({ ...healthy, membershipStatus: "removed" })).toBe(
      "membership_suspended",
    );
  });

  it("reports the user status first when several apply", () => {
    expect(
      accountStatusBlock({
        userStatus: "disabled",
        organizationStatus: "suspended",
        membershipStatus: "removed",
        isPlatformAdmin: false,
      }),
    ).toBe("account_disabled");
  });

  // The staff-invite flow signs in with an 'invited' membership to set a password.
  it("still allows an invited membership", () => {
    expect(
      accountStatusBlock({ ...healthy, userStatus: "invited", membershipStatus: "invited" }),
    ).toBeNull();
  });

  // Suspending an org must not lock an admin out of the console that suspends orgs…
  it("exempts platform admins from tenant state", () => {
    expect(
      accountStatusBlock({ ...healthy, organizationStatus: "suspended", isPlatformAdmin: true }),
    ).toBeNull();
    expect(
      accountStatusBlock({ ...healthy, membershipStatus: "removed", isPlatformAdmin: true }),
    ).toBeNull();
  });

  // …but users.status stays the kill switch for a compromised admin account.
  it("still locks out a disabled platform admin", () => {
    expect(accountStatusBlock({ ...healthy, userStatus: "disabled", isPlatformAdmin: true })).toBe(
      "account_disabled",
    );
  });
});
