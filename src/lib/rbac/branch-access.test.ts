import { describe, expect, it } from "vitest";
import {
  filterBranchesForContext,
  isBranchAllowedForContext,
  resolveAllowedBranchIdsFromAssignments,
} from "@/lib/rbac/branch-access";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

function ctx(partial: Pick<AuthContext, "allowedBranchIds">): AuthContext {
  return partial as AuthContext;
}

describe("resolveAllowedBranchIdsFromAssignments", () => {
  it("returns the same ids when non-empty", () => {
    expect(resolveAllowedBranchIdsFromAssignments(["a", "b"])).toEqual(["a", "b"]);
  });

  it("returns empty array when no assignments (never org-wide)", () => {
    expect(resolveAllowedBranchIdsFromAssignments([])).toEqual([]);
  });
});

describe("filterBranchesForContext", () => {
  it("returns all branches when allowedBranchIds is null", () => {
    const branches = [{ id: "a" }, { id: "b" }];
    expect(filterBranchesForContext(ctx({ allowedBranchIds: null }), branches)).toEqual(branches);
  });

  it("filters to allowed ids", () => {
    expect(filterBranchesForContext(ctx({ allowedBranchIds: ["a"] }), [{ id: "a" }, { id: "b" }])).toEqual([
      { id: "a" },
    ]);
  });
});

describe("isBranchAllowedForContext", () => {
  it("denies when branch not in scoped list", () => {
    expect(isBranchAllowedForContext(ctx({ allowedBranchIds: ["a"] }), "b")).toBe(false);
  });

  it("allows when scoped list is null", () => {
    expect(isBranchAllowedForContext(ctx({ allowedBranchIds: null }), "any")).toBe(true);
  });
});
