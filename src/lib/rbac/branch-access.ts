import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

/**
 * Maps active `branch_staff_assignments` query results to the branch id list
 * stored on `AuthContext.allowedBranchIds`. Empty means no branch access — never
 * implicit org-wide (callers should not widen this to `null` for that reason).
 */
export function resolveAllowedBranchIdsFromAssignments(assignmentBranchIds: string[]): string[] {
  return assignmentBranchIds.length > 0 ? assignmentBranchIds : [];
}

export function filterBranchesForContext<T extends { id: string }>(
  context: AuthContext,
  branches: T[],
): T[] {
  if (context.allowedBranchIds === null) {
    return branches;
  }
  const allowed = new Set(context.allowedBranchIds);
  return branches.filter((b) => allowed.has(b.id));
}

export function isBranchAllowedForContext(context: AuthContext, branchId: string): boolean {
  if (context.allowedBranchIds === null) {
    return true;
  }
  return context.allowedBranchIds.includes(branchId);
}

export function assertBranchAllowedForContext(context: AuthContext, branchId: string | undefined): void {
  if (!branchId) {
    return;
  }
  if (!isBranchAllowedForContext(context, branchId)) {
    throw new Error("You do not have access to this branch.");
  }
}
