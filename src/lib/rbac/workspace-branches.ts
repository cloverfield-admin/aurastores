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
  const rows = await db.query.branches.findMany({
    where: eq(branches.organizationId, context.organization.id),
    orderBy: (b, { desc: orderDesc, asc: orderAsc }) => [orderDesc(b.isPrimary), orderAsc(b.name)],
  });
  return filterBranchesForContext(context, rows).map((b) => ({
    id: b.id,
    name: b.name,
    isPrimary: b.isPrimary,
  }));
}
