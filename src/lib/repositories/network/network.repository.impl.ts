import { and, asc, desc, eq, gt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { branches, inventoryBatches, inventoryTransactions, organizationMemberships, products, sales, users } from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type {
  NetworkBranchSummary,
  NetworkDashboardData,
  NetworkRepository,
} from "@/lib/repositories/network/network.repository";

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDateStringUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function listOrganizationBranches(organizationId: string) {
  return db.query.branches.findMany({
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function branchStockHealth(orgId: string, branchId: string, todayStr: string) {
  const branchStockSq = db.$with("branch_stock").as(
    db
      .select({
        productId: inventoryBatches.productId,
        totalAvailable: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`.as(
          "total_available",
        ),
      })
      .from(inventoryBatches)
      .where(
        and(eq(inventoryBatches.organizationId, orgId), eq(inventoryBatches.branchId, branchId)),
      )
      .groupBy(inventoryBatches.productId),
  );

  const productStockRows = await db
    .with(branchStockSq)
    .select({
      productId: products.id,
      reorderLevel: products.reorderLevel,
      totalAvailable: sql<number>`coalesce(${branchStockSq.totalAvailable}, 0)::int`,
    })
    .from(products)
    .leftJoin(branchStockSq, eq(branchStockSq.productId, products.id))
    .where(eq(products.organizationId, orgId));

  const expiryRow = await db
    .select({
      nearExpiryBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.expiresAt}::date >= ${todayStr}::date and ${inventoryBatches.expiresAt}::date <= (${todayStr}::date + interval '30 days'))::int`,
      expiredBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.expiresAt}::date < ${todayStr}::date)::int`,
      activeBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.expiresAt}::date > (${todayStr}::date + interval '30 days'))::int`,
      totalBatchCount: sql<number>`count(*)::int`,
    })
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.organizationId, orgId),
        eq(inventoryBatches.branchId, branchId),
        ne(inventoryBatches.status, "disposed"),
        gt(inventoryBatches.quantityAvailable, 0),
      ),
    );

  const lowStockProducts = productStockRows.filter(
    (row) => row.reorderLevel > 0 && row.totalAvailable > 0 && row.totalAvailable <= row.reorderLevel,
  );

  const e = expiryRow[0];
  const totalBatchCount = Number(e?.totalBatchCount ?? 0);
  const activeBatchCount = Number(e?.activeBatchCount ?? 0);
  const healthyBatchRatio =
    totalBatchCount > 0 ? Math.round((activeBatchCount / totalBatchCount) * 100) : 0;

  return {
    lowStockSkuCount: lowStockProducts.length,
    healthyBatchRatio,
    totalBatchCount,
  };
}

export class NetworkRepositoryImpl implements NetworkRepository {
  async getDashboard(context: AuthContext): Promise<NetworkDashboardData> {
    const orgId = context.organization.id;
    const branchRows = await listOrganizationBranches(orgId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);
    const todayStr = toDateStringUtc(startOfTodayUtc());

    const salesWindowRows = await db
      .select({
        branchId: sales.branchId,
        totalCents: sales.totalCents,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.organizationId, orgId),
          eq(sales.status, "completed"),
          sql`${sales.createdAt} >= ${sixtyDaysAgo.toISOString()}`,
        ),
      );

    const totalRevenueCents30d = salesWindowRows
      .filter((row) => row.createdAt >= thirtyDaysAgo)
      .reduce((sum, row) => sum + row.totalCents, 0);
    const previousRevenueCents30d = salesWindowRows
      .filter((row) => row.createdAt >= sixtyDaysAgo && row.createdAt < thirtyDaysAgo)
      .reduce((sum, row) => sum + row.totalCents, 0);

    const staffRows = await db
      .select({
        fullName: users.fullName,
        status: organizationMemberships.status,
      })
      .from(organizationMemberships)
      .innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(
        and(eq(organizationMemberships.organizationId, orgId), ne(organizationMemberships.status, "removed")),
      );

    const activeStaffCount = staffRows.filter((r) => r.status === "active").length;
    const totalStaffCount = staffRows.length;
    const staffPreviewNames = staffRows
      .filter((r) => r.status === "active")
      .slice(0, 3)
      .map((r) => r.fullName);

    const branchSummaries: NetworkBranchSummary[] = await Promise.all(
      branchRows.map(async (b) => {
        const revenueRows = await db
          .select({
            sum: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, orgId),
              eq(sales.branchId, b.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${thirtyDaysAgo.toISOString()}`,
            ),
          );

        const unitsRow = await db
          .select({
            unitsSold: sql<number>`coalesce(sum(abs(${inventoryTransactions.quantityDelta})), 0)::int`,
          })
          .from(inventoryTransactions)
          .where(
            and(
              eq(inventoryTransactions.organizationId, orgId),
              eq(inventoryTransactions.branchId, b.id),
              eq(inventoryTransactions.transactionType, "sale"),
              sql`${inventoryTransactions.occurredAt} >= ${thirtyDaysAgo.toISOString()}`,
            ),
          );

        const health = await branchStockHealth(orgId, b.id, todayStr);

        const lead = await db
          .select({ name: users.fullName })
          .from(branches)
          .leftJoin(users, eq(users.id, branches.leadPharmacistUserId))
          .where(eq(branches.id, b.id))
          .limit(1);

        return {
          id: b.id,
          name: b.name,
          isPrimary: b.isPrimary,
          branchStatus: b.status,
          revenueCents30d: Number(revenueRows[0]?.sum ?? 0),
          lowStockSkuCount: health.lowStockSkuCount,
          healthyBatchRatio: health.healthyBatchRatio,
          unitsSold30d: Number(unitsRow[0]?.unitsSold ?? 0),
          leadPharmacistName: lead[0]?.name ?? null,
        };
      }),
    );

    const totalLowStockSkuCount = branchSummaries.reduce((s, b) => s + b.lowStockSkuCount, 0);
    const healthyBatchRatioAvg =
      branchSummaries.length > 0
        ? Math.round(
            branchSummaries.reduce((s, b) => s + b.healthyBatchRatio, 0) / branchSummaries.length,
          )
        : 0;

    return {
      totals: {
        totalRevenueCents30d,
        previousRevenueCents30d,
        totalLowStockSkuCount,
        healthyBatchRatioAvg,
        activeStaffCount,
        totalStaffCount,
      },
      branches: branchSummaries,
      staffPreviewNames,
    };
  }
}

export const networkRepository: NetworkRepository = new NetworkRepositoryImpl();
