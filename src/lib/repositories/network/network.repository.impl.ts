import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Column } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  expenses,
  inventoryBatches,
  inventoryTransactions,
  organizationMemberships,
  products,
  saleItems,
  sales,
  organizations,
  users,
} from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import type {
  NetworkBranchSummary,
  NetworkDashboardData,
  NetworkRepository,
  OrganizationBranchesData,
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

function branchScopeWhere(context: AuthContext, branchColumn: Column) {
  if (context.allowedBranchIds === null) {
    return undefined;
  }
  if (context.allowedBranchIds.length === 0) {
    return sql`false`;
  }
  return inArray(branchColumn, context.allowedBranchIds);
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
    const allBranchRows = await listOrganizationBranches(orgId);
    const branchRows = filterBranchesForContext(context, allBranchRows);
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
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
          ),
        )
        .groupBy(inventoryBatches.branchId, inventoryBatches.productId),
    );

    const [
      salesTotalsRows,
      cogsTotalsRows,
      expensesTotalsRows,
      chargeTotalsRows,
      staffMetricRows,
      staffPreviewRows,
      branchRevenueRows,
      branchCogsRows,
      branchExpensesRows,
      branchChargeRows,
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
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalCogsCents30d:
            sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(inventoryBatches, eq(saleItems.batchId, inventoryBatches.id))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalExpensesCents30d: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalChargeExpensesCents30d: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            eq(expenses.expenseType, "charge"),
            sql`${expenses.expenseDate} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
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
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        )
        .groupBy(sales.branchId),
      db
        .select({
          branchId: sales.branchId,
          cogsCents30d:
            sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(inventoryBatches, eq(saleItems.batchId, inventoryBatches.id))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        )
        .groupBy(sales.branchId),
      db
        .select({
          branchId: expenses.branchId,
          expensesCents30d: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        )
        .groupBy(expenses.branchId),
      db
        .select({
          branchId: expenses.branchId,
          chargeExpensesCents30d: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            eq(expenses.expenseType, "charge"),
            sql`${expenses.expenseDate} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        )
        .groupBy(expenses.branchId),
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
            ...(branchScopeWhere(context, inventoryTransactions.branchId)
              ? [branchScopeWhere(context, inventoryTransactions.branchId)!]
              : []),
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
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
          ),
        )
        .groupBy(inventoryBatches.branchId),
    ]);

    const salesTotals = salesTotalsRows[0];
    const cogsTotals = cogsTotalsRows[0];
    const staffMetrics = staffMetricRows[0];
    const revenueByBranchId = numberByBranchId(
      branchRevenueRows,
      (row) => Number(row.revenueCents30d ?? 0),
    );
    const cogsByBranchId = numberByBranchId(
      branchCogsRows,
      (row) => Number(row.cogsCents30d ?? 0),
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
    const totalCogsCents30d = Number(cogsTotals?.totalCogsCents30d ?? 0);
    const totalExpensesCents30d = Number(expensesTotalsRows[0]?.totalExpensesCents30d ?? 0);
    const totalChargeExpensesCents30d = Number(chargeTotalsRows[0]?.totalChargeExpensesCents30d ?? 0);
    const totalGrossProfitCents30d = totalRevenueCents30d - totalCogsCents30d - totalExpensesCents30d;
    const activeStaffCount = Number(staffMetrics?.activeStaffCount ?? 0);
    const totalStaffCount = Number(staffMetrics?.totalStaffCount ?? 0);
    const staffPreviewNames = staffPreviewRows.map((row) => row.fullName);
    const expensesByBranchId = numberByBranchId(branchExpensesRows, (row) => Number(row.expensesCents30d ?? 0));
    const chargeByBranchId = numberByBranchId(branchChargeRows, (row) => Number(row.chargeExpensesCents30d ?? 0));

    const branchSummaries: NetworkBranchSummary[] = branchRows.map((branch) => {
      const revenueCents30d = revenueByBranchId.get(branch.id) ?? 0;
      const cogsCents30d = cogsByBranchId.get(branch.id) ?? 0;
      const expensesCents30d = expensesByBranchId.get(branch.id) ?? 0;
      const chargeExpensesCents30d = chargeByBranchId.get(branch.id) ?? 0;

      return {
        id: branch.id,
        name: branch.name,
        isPrimary: branch.isPrimary,
        branchStatus: branch.status,
        revenueCents30d,
        cogsCents30d,
        expensesCents30d,
        chargeExpensesCents30d,
        grossProfitCents30d: revenueCents30d - cogsCents30d - expensesCents30d,
        lowStockSkuCount: lowStockByBranchId.get(branch.id) ?? 0,
        healthyBatchRatio: healthByBranchId.get(branch.id)?.healthyBatchRatio ?? 0,
        unitsSold30d: unitsByBranchId.get(branch.id) ?? 0,
        leadPharmacistName: branch.leadPharmacistName ?? null,
      };
    });

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
        totalCogsCents30d,
        totalExpensesCents30d,
        totalChargeExpensesCents30d,
        totalGrossProfitCents30d,
        totalLowStockSkuCount,
        healthyBatchRatioAvg,
        activeStaffCount,
        totalStaffCount,
      },
      branches: branchSummaries,
      staffPreviewNames,
    };
  }

  async getOrganizationBranches(context: AuthContext): Promise<OrganizationBranchesData> {
    const orgId = context.organization.id;
    const allBranchRows = await listOrganizationBranches(orgId);
    const branchRows = filterBranchesForContext(context, allBranchRows);
    const orgRow =
      (await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      })) ?? context.organization;
    return {
      branches: branchRows.map((b) => ({
        id: b.id,
        name: b.name,
        isPrimary: b.isPrimary,
        status: b.status,
        leadPharmacistName: b.leadPharmacistName ?? null,
      })),
      salesTax: {
        enabled: Boolean(orgRow.salesTaxEnabled),
        rateBps: Number.isFinite(orgRow.salesTaxRateBps as number) ? (orgRow.salesTaxRateBps as number) : 0,
      },
    };
  }
}

export const networkRepository: NetworkRepository = new NetworkRepositoryImpl();
