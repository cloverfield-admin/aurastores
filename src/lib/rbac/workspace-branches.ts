import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";

export type WorkspaceBranchTab = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export async function loadAccessibleBranchTabs(context: AuthContext): Promise<WorkspaceBranchTab[]> {
  const rows = await db
    .select({
      id: branches.id,
      name: branches.name,
      isPrimary: branches.isPrimary,
    })
    .from(branches)
    .where(eq(branches.organizationId, context.organization.id))
    .orderBy(desc(branches.isPrimary), asc(branches.name));

  return filterBranchesForContext(context, rows).map((b) => ({
    id: b.id,
    name: b.name,
    isPrimary: b.isPrimary,
  }));
}
