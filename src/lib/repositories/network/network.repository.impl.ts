import { and, asc, desc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import type { Column } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  branchStaffAssignments,
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
import { resolveDashboardUtcRangeWindow } from "@/lib/dates/dashboard-range-window";
import { computeGrossProfitCents } from "@/lib/finance/gross-profit";
import type { SalesDateRange } from "@/lib/repositories/sales/sales.repository";
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
  const branchRows = await db
    .select({
      id: branches.id,
      name: branches.name,
      isPrimary: branches.isPrimary,
      status: branches.status,
    })
    .from(branches)
    .where(eq(branches.organizationId, organizationId))
    .orderBy(desc(branches.isPrimary), asc(branches.name));

  if (branchRows.length === 0) {
    return [];
  }

  const leadRows = await db
    .select({
      branchId: branchStaffAssignments.branchId,
      fullName: users.fullName,
    })
    .from(branchStaffAssignments)
    .innerJoin(users, eq(users.id, branchStaffAssignments.userId))
    .where(
      and(
        inArray(
          branchStaffAssignments.branchId,
          branchRows.map((branch) => branch.id),
        ),
        eq(branchStaffAssignments.status, "active"),
        eq(branchStaffAssignments.isLead, true),
      ),
    );

  const leadNameByBranchId = new Map<string, string>();
  for (const lead of leadRows) {
    if (!leadNameByBranchId.has(lead.branchId)) {
      leadNameByBranchId.set(lead.branchId, lead.fullName);
    }
  }

  return branchRows.map((branch) => ({
    ...branch,
    leadStaffName: leadNameByBranchId.get(branch.id) ?? null,
  }));
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
  async getDashboard(context: AuthContext, range?: SalesDateRange): Promise<NetworkDashboardData> {
    const orgId = context.organization.id;
    const allBranchRows = await listOrganizationBranches(orgId);
    const branchRows = filterBranchesForContext(context, allBranchRows);
    const w = resolveDashboardUtcRangeWindow(range);
    const { startIso, endExclusiveIso, prevStartIso, prevEndExclusiveIso } = w;
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
      restockingTotalsRows,
      chargeTotalsRows,
      staffMetricRows,
      staffPreviewRows,
      branchRevenueRows,
      branchCogsRows,
      branchExpensesRows,
      branchRestockingRows,
      branchChargeRows,
      branchUnitsRows,
      branchLowStockRows,
      branchHealthRows,
    ] = await Promise.all([
      db
        .select({
          totalRevenueCents30d:
            sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
          previousRevenueCents30d:
            sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${prevStartIso}::timestamptz and ${sales.createdAt} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalCogsCents30d:
            sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(inventoryBatches, eq(saleItems.batchId, inventoryBatches.id))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalOperatingExpensesCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} in ('general', 'charge') and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalRestockingCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'restocking' and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        ),
      db
        .select({
          totalChargeExpensesCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'charge' and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            eq(expenses.expenseType, "charge"),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
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
          revenueCents30d:
            sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        )
        .groupBy(sales.branchId),
      db
        .select({
          branchId: sales.branchId,
          cogsCents30d:
            sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(inventoryBatches, eq(saleItems.batchId, inventoryBatches.id))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
          ),
        )
        .groupBy(sales.branchId),
      db
        .select({
          branchId: expenses.branchId,
          operatingExpensesCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} in ('general', 'charge') and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        )
        .groupBy(expenses.branchId),
      db
        .select({
          branchId: expenses.branchId,
          restockingCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'restocking' and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        )
        .groupBy(expenses.branchId),
      db
        .select({
          branchId: expenses.branchId,
          chargeExpensesCents30d:
            sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'charge' and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            eq(expenses.expenseType, "charge"),
            sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ...(branchScopeWhere(context, expenses.branchId) ? [branchScopeWhere(context, expenses.branchId)!] : []),
          ),
        )
        .groupBy(expenses.branchId),
      db
        .select({
          branchId: inventoryTransactions.branchId,
          unitsSold30d:
            sql<number>`coalesce(sum(abs(${inventoryTransactions.quantityDelta})) filter (where ${inventoryTransactions.occurredAt} >= ${startIso}::timestamptz and ${inventoryTransactions.occurredAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
        })
        .from(inventoryTransactions)
        .where(
          and(
            eq(inventoryTransactions.organizationId, orgId),
            eq(inventoryTransactions.transactionType, "sale"),
            sql`${inventoryTransactions.occurredAt} >= ${prevStartIso}::timestamptz`,
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
    const totalExpensesCents30d = Number(expensesTotalsRows[0]?.totalOperatingExpensesCents30d ?? 0);
    const totalRestockingCents30d = Number(restockingTotalsRows[0]?.totalRestockingCents30d ?? 0);
    const { excessRestockingCents: excessRestockingCents30d, grossProfitCents: totalGrossProfitCents30d } =
      computeGrossProfitCents({
        revenueCents: totalRevenueCents30d,
        cogsCents: totalCogsCents30d,
        operatingExpensesCents: totalExpensesCents30d,
        restockingCents: totalRestockingCents30d,
      });
    const totalChargeExpensesCents30d = Number(chargeTotalsRows[0]?.totalChargeExpensesCents30d ?? 0);
    const activeStaffCount = Number(staffMetrics?.activeStaffCount ?? 0);
    const totalStaffCount = Number(staffMetrics?.totalStaffCount ?? 0);
    const staffPreviewNames = staffPreviewRows.map((row) => row.fullName);
    const operatingByBranchId = numberByBranchId(
      branchExpensesRows,
      (row) => Number(row.operatingExpensesCents30d ?? 0),
    );
    const restockingByBranchId = numberByBranchId(
      branchRestockingRows,
      (row) => Number(row.restockingCents30d ?? 0),
    );
    const chargeByBranchId = numberByBranchId(branchChargeRows, (row) => Number(row.chargeExpensesCents30d ?? 0));

    const branchSummaries: NetworkBranchSummary[] = branchRows.map((branch) => {
      const revenueCents30d = revenueByBranchId.get(branch.id) ?? 0;
      const cogsCents30d = cogsByBranchId.get(branch.id) ?? 0;
      const expensesCents30d = operatingByBranchId.get(branch.id) ?? 0;
      const restockingCents30d = restockingByBranchId.get(branch.id) ?? 0;
      const chargeExpensesCents30d = chargeByBranchId.get(branch.id) ?? 0;
      const { grossProfitCents: grossProfitCents30d } = computeGrossProfitCents({
        revenueCents: revenueCents30d,
        cogsCents: cogsCents30d,
        operatingExpensesCents: expensesCents30d,
        restockingCents: restockingCents30d,
      });

      return {
        id: branch.id,
        name: branch.name,
        isPrimary: branch.isPrimary,
        branchStatus: branch.status,
        revenueCents30d,
        cogsCents30d,
        expensesCents30d,
        restockingCents30d,
        chargeExpensesCents30d,
        grossProfitCents30d,
        lowStockSkuCount: lowStockByBranchId.get(branch.id) ?? 0,
        healthyBatchRatio: healthByBranchId.get(branch.id)?.healthyBatchRatio ?? 0,
        unitsSold30d: unitsByBranchId.get(branch.id) ?? 0,
        leadStaffName: branch.leadStaffName ?? null,
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
        totalRestockingCents30d,
        excessRestockingCents30d,
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
        leadStaffName: b.leadStaffName ?? null,
      })),
      salesTax: {
        enabled: Boolean(orgRow.salesTaxEnabled),
        rateBps: Number.isFinite(orgRow.salesTaxRateBps as number) ? (orgRow.salesTaxRateBps as number) : 0,
      },
    };
  }
}

export const networkRepository: NetworkRepository = new NetworkRepositoryImpl();
