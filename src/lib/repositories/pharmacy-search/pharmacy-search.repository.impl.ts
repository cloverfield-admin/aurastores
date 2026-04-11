import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, products } from "@/lib/db/schema";
import { ROUTES } from "@/lib/routes";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import type {
  PharmacySearchHit,
  PharmacySearchRepository,
  PharmacySearchResult,
} from "./pharmacy-search.repository";

const LIMIT = 6;

async function resolveDefaultStockBranchId(organizationId: string): Promise<string | null> {
  const row = await db.query.branches.findFirst({
    where: eq(branches.organizationId, organizationId),
    orderBy: (b, { desc: orderDesc, asc: orderAsc }) => [orderDesc(b.isPrimary), orderAsc(b.name)],
  });
  return row?.id ?? null;
}

export class PharmacySearchRepositoryImpl implements PharmacySearchRepository {
  async search(context: AuthContext, q: string): Promise<PharmacySearchResult> {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      return { hits: [] };
    }

    const pattern = `%${trimmed}%`;
    const orgId = context.organization.id;
    const defaultBranchId = await resolveDefaultStockBranchId(orgId);
    const qLower = trimmed.toLowerCase();

    const [branchRows, staffRows, productRows] = await Promise.all([
      db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(and(eq(branches.organizationId, orgId), ilike(branches.name, pattern)))
        .orderBy(desc(branches.isPrimary), asc(branches.name))
        .limit(LIMIT),
      staffRepository.searchDirectory(context, trimmed, LIMIT),
      db
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
        .limit(LIMIT),
    ]);

    const hits: PharmacySearchHit[] = [];

    for (const b of branchRows) {
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
        subtitle: p.sku,
        href: `${productHrefPrefix}${encodeURIComponent(p.name)}`,
      });
    }

    return { hits };
  }
}

export const pharmacySearchRepository: PharmacySearchRepository = new PharmacySearchRepositoryImpl();
