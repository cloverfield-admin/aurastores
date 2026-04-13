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
  return db
    .select({
      id: branches.id,
      name: branches.name,
      isPrimary: branches.isPrimary,
      status: branches.status,
      leadPharmacistName: users.fullName,
    })
    .from(branches)
    .leftJoin(users, eq(users.id, branches.leadPharmacistUserId))
    .where(eq(branches.organizationId, organizationId))
    .orderBy(desc(branches.isPrimary), asc(branches.name));
}

function numberByBranchId<T extends { branchId: string }>(
  rows: T[],
  getValue: (row: T) => number,
) {
  return new Map(rows.map((row) => [row.branchId, getValue(row)]));
}

export class NetworkRepositoryImpl implements NetworkRepository {
  async getDashboard(context: AuthContext): Promise<NetworkDashboardData> {
    const orgId = context.organization.id;
    const branchRows = await listOrganizationBranches(orgId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
    const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();
    const todaySql = sql.raw(`'${toDateStringUtc(startOfTodayUtc())}'::date`);
    const branchProductStockSq = db.$with("branch_product_stock").as(
      db
        .select({
          branchId: inventoryBatches.branchId,
          productId: inventoryBatches.productId,
          totalAvailable: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`.as(
            "total_available",
          ),
        })
        .from(inventoryBatches)
        .where(eq(inventoryBatches.organizationId, orgId))
        .groupBy(inventoryBatches.branchId, inventoryBatches.productId),
    );

    const [
      salesTotalsRows,
      staffMetricRows,
      staffPreviewRows,
      branchRevenueRows,
      branchUnitsRows,
      branchLowStockRows,
      branchHealthRows,
    ] = await Promise.all([
      db
        .select({
          totalRevenueCents30d:
            sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz), 0)::int`,
          previousRevenueCents30d:
            sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${sixtyDaysAgoIso}::timestamptz and ${sales.createdAt} < ${thirtyDaysAgoIso}::timestamptz), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${sixtyDaysAgoIso}::timestamptz`,
          ),
        ),
      db
        .select({
          activeStaffCount:
            sql<number>`count(*) filter (where ${organizationMemberships.status} = 'active')::int`,
          totalStaffCount: sql<number>`count(*)::int`,
        })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, orgId),
            ne(organizationMemberships.status, "removed"),
          ),
        ),
      db
        .select({
          fullName: users.fullName,
        })
        .from(organizationMemberships)
        .innerJoin(users, eq(users.id, organizationMemberships.userId))
        .where(
          and(
            eq(organizationMemberships.organizationId, orgId),
            eq(organizationMemberships.status, "active"),
          ),
        )
        .limit(3),
      db
        .select({
          branchId: sales.branchId,
          revenueCents30d: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
          ),
        )
        .groupBy(sales.branchId),
      db
        .select({
          branchId: inventoryTransactions.branchId,
          unitsSold30d: sql<number>`coalesce(sum(abs(${inventoryTransactions.quantityDelta})), 0)::int`,
        })
        .from(inventoryTransactions)
        .where(
          and(
            eq(inventoryTransactions.organizationId, orgId),
            eq(inventoryTransactions.transactionType, "sale"),
            sql`${inventoryTransactions.occurredAt} >= ${thirtyDaysAgoIso}::timestamptz`,
          ),
        )
        .groupBy(inventoryTransactions.branchId),
      db
        .with(branchProductStockSq)
        .select({
          branchId: branchProductStockSq.branchId,
          lowStockSkuCount:
            sql<number>`count(*) filter (where ${products.reorderLevel} > 0 and ${branchProductStockSq.totalAvailable} > 0 and ${branchProductStockSq.totalAvailable} <= ${products.reorderLevel})::int`,
        })
        .from(branchProductStockSq)
        .innerJoin(products, eq(products.id, branchProductStockSq.productId))
        .where(eq(products.organizationId, orgId))
        .groupBy(branchProductStockSq.branchId),
      db
        .select({
          branchId: inventoryBatches.branchId,
          activeBatchCount:
            sql<number>`count(*) filter (where ${inventoryBatches.expiresAt}::date > (${todaySql} + interval '30 days'))::int`,
          totalBatchCount: sql<number>`count(*)::int`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            ne(inventoryBatches.status, "disposed"),
            gt(inventoryBatches.quantityAvailable, 0),
          ),
        )
        .groupBy(inventoryBatches.branchId),
    ]);

    const salesTotals = salesTotalsRows[0];
    const staffMetrics = staffMetricRows[0];
    const revenueByBranchId = numberByBranchId(
      branchRevenueRows,
      (row) => Number(row.revenueCents30d ?? 0),
    );
    const unitsByBranchId = numberByBranchId(
      branchUnitsRows,
      (row) => Number(row.unitsSold30d ?? 0),
    );
    const lowStockByBranchId = numberByBranchId(
      branchLowStockRows,
      (row) => Number(row.lowStockSkuCount ?? 0),
    );
    const healthByBranchId = new Map(
      branchHealthRows.map((row) => {
        const totalBatchCount = Number(row.totalBatchCount ?? 0);
        const activeBatchCount = Number(row.activeBatchCount ?? 0);

        return [
          row.branchId,
          {
            healthyBatchRatio:
              totalBatchCount > 0 ? Math.round((activeBatchCount / totalBatchCount) * 100) : 0,
          },
        ];
      }),
    );

    const totalRevenueCents30d = Number(salesTotals?.totalRevenueCents30d ?? 0);
    const previousRevenueCents30d = Number(salesTotals?.previousRevenueCents30d ?? 0);
    const activeStaffCount = Number(staffMetrics?.activeStaffCount ?? 0);
    const totalStaffCount = Number(staffMetrics?.totalStaffCount ?? 0);
    const staffPreviewNames = staffPreviewRows.map((row) => row.fullName);

    const branchSummaries: NetworkBranchSummary[] = branchRows.map((branch) => ({
      id: branch.id,
      name: branch.name,
      isPrimary: branch.isPrimary,
      branchStatus: branch.status,
      revenueCents30d: revenueByBranchId.get(branch.id) ?? 0,
      lowStockSkuCount: lowStockByBranchId.get(branch.id) ?? 0,
      healthyBatchRatio: healthByBranchId.get(branch.id)?.healthyBatchRatio ?? 0,
      unitsSold30d: unitsByBranchId.get(branch.id) ?? 0,
      leadPharmacistName: branch.leadPharmacistName ?? null,
    }));

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
