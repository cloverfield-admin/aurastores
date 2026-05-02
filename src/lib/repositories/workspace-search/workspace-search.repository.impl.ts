import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, products } from "@/lib/db/schema";
import { ROUTES } from "@/lib/routes";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import { hasCapability } from "@/lib/rbac/capabilities";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import type {
  WorkspaceSearchHit,
  WorkspaceSearchRepository,
  WorkspaceSearchResult,
} from "./workspace-search.repository";

const LIMIT = 6;

async function resolveDefaultStockBranchIdForContext(context: AuthContext): Promise<string | null> {
  const rows = await db.query.branches.findMany({
    where: eq(branches.organizationId, context.organization.id),
    orderBy: (b, { desc: orderDesc, asc: orderAsc }) => [orderDesc(b.isPrimary), orderAsc(b.name)],
  });
  const visible = filterBranchesForContext(context, rows);
  return visible[0]?.id ?? null;
}

export class WorkspaceSearchRepositoryImpl implements WorkspaceSearchRepository {
  async search(context: AuthContext, q: string): Promise<WorkspaceSearchResult> {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      return { hits: [] };
    }

    const pattern = `%${trimmed}%`;
    const orgId = context.organization.id;
    const defaultBranchId = await resolveDefaultStockBranchIdForContext(context);
    const qLower = trimmed.toLowerCase();

    const canStock = hasCapability(context.capabilities, "stock");
    const canStaff = hasCapability(context.capabilities, "staff");
    const canCatalog = hasCapability(context.capabilities, "catalog");

    const [branchRows, staffRows, productRows] = await Promise.all([
      canStock
        ? db
            .select({ id: branches.id, name: branches.name })
            .from(branches)
            .where(and(eq(branches.organizationId, orgId), ilike(branches.name, pattern)))
            .orderBy(desc(branches.isPrimary), asc(branches.name))
            .limit(LIMIT)
        : Promise.resolve([] as { id: string; name: string }[]),
      canStaff ? staffRepository.searchDirectory(context, trimmed, LIMIT) : Promise.resolve([]),
      canStock || canCatalog
        ? db
            .select({
              id: products.id,
              name: products.name,
              sku: products.sku,
            })
            .from(products)
            .where(
              and(
                eq(products.organizationId, orgId),
                or(ilike(products.name, pattern), ilike(products.sku, pattern)),
              ),
            )
            .orderBy(asc(products.name))
            .limit(LIMIT)
        : Promise.resolve([] as { id: string; name: string; sku: string | null }[]),
    ]);

    const branchRowsFiltered = filterBranchesForContext(
      context,
      branchRows as { id: string; name: string }[],
    );

    const hits: WorkspaceSearchHit[] = [];

    for (const b of branchRowsFiltered) {
      hits.push({
        kind: "branch",
        id: b.id,
        title: b.name,
        subtitle: "Branch",
        href: `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(b.id)}`,
      });
    }

    for (const m of staffRows) {
      const qToken = m.email.toLowerCase().includes(qLower) ? m.email : m.fullName;
      hits.push({
        kind: "staff",
        id: m.membershipId,
        title: m.fullName,
        subtitle: m.email,
        href: `${ROUTES.dashboard.staff}?q=${encodeURIComponent(qToken)}`,
      });
    }

    const productHrefPrefix =
      defaultBranchId != null
        ? `${ROUTES.dashboard.stock}?branch=${encodeURIComponent(defaultBranchId)}&q=`
        : `${ROUTES.dashboard.stock}?q=`;

    for (const p of productRows) {
      hits.push({
        kind: "product",
        id: p.id,
        title: p.name,
        subtitle: p.sku ?? undefined,
        href: `${productHrefPrefix}${encodeURIComponent(p.name)}`,
      });
    }

    return { hits };
  }
}

export const workspaceSearchRepository: WorkspaceSearchRepository = new WorkspaceSearchRepositoryImpl();
