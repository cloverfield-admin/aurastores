import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Column } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  inventoryBatches,
  inventoryTransactions,
  organizationMemberships,
  productCategories,
  products,
  saleItems,
  sales,
} from "@/lib/db/schema";
import { addStoreDays, storeDateKey, storeTimeZone, storeToday } from "@/lib/dates/store-day-window";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import type {
  InsightsDispensingSnapshot,
  InsightsHeatmapCell,
  InsightsHeatmapDimension,
  InsightsHeatmapRow,
  InsightsInventoryHealthPoint,
  InsightsOperationsPoint,
  InsightsOverviewData,
  InsightsRepository,
  InsightsTrendPoint,
} from "@/lib/repositories/insights/insights.repository";

async function listOrganizationBranches(organizationId: string) {
  return db
    .select({
      id: branches.id,
      name: branches.name,
      isPrimary: branches.isPrimary,
      status: branches.status,
      latitude: branches.latitude,
      longitude: branches.longitude,
    })
    .from(branches)
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

function normalizeIntensity(value: number, max: number) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

export class InsightsRepositoryImpl implements InsightsRepository {
  async getOverview(context: AuthContext, options?: { branchId?: string }): Promise<InsightsOverviewData> {
    const orgId = context.organization.id;
    const allBranchRows = await listOrganizationBranches(orgId);
    const visibleBranches = filterBranchesForContext(context, allBranchRows);

    const branchId = options?.branchId || undefined;
    const scopedBranches =
      branchId != null ? visibleBranches.filter((b) => b.id === branchId) : visibleBranches;
    if (branchId != null && scopedBranches.length === 0) {
      throw new Error("No branch access assigned for the requested branch.");
    }

    const branchIds = scopedBranches.map((b) => b.id);

    // Days follow the scoped branch's zone, or the org's primary branch when the
    // view spans all of them — see store-day-window.
    const timeZone = await storeTimeZone(orgId, branchId);
    const today = storeToday(timeZone);
    const todayStr = storeDateKey(today, timeZone);
    const todaySql = sql.raw(`'${todayStr}'::date`);
    const thirtyDaysAgoIso = addStoreDays(today, -30, timeZone).toISOString();
    const ninetyDaysAgoIso = addStoreDays(today, -90, timeZone).toISOString();

    const branchSalesWhere = branchId ? [eq(sales.branchId, branchId)] : branchIds.length ? [inArray(sales.branchId, branchIds)] : [];
    const branchBatchWhere = branchId ? [eq(inventoryBatches.branchId, branchId)] : branchIds.length ? [inArray(inventoryBatches.branchId, branchIds)] : [];
    const branchTxnWhere = branchId ? [eq(inventoryTransactions.branchId, branchId)] : branchIds.length ? [inArray(inventoryTransactions.branchId, branchIds)] : [];

    const [
      salesAggRow,
      unitsAggRow,
      staffAggRow,
      nearExpiryRow,
      nearExpiryValueRow,
      lowStockByBranchRows,
      healthByBranchRows,
      salesTrendRows,
      unitsTrendRows,
      nearExpiryTrendRows,
      dispensingTopMedRows,
      dispensingTopCategoryRows,
      forecastRows,
      availabilityRows,
      forecastPriceRows,
    ] = await Promise.all([
      db
        .select({
          revenueCents30d: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          salesCount30d: sql<number>`coalesce(count(*), 0)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
            ...branchSalesWhere,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
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
            ...branchTxnWhere,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          activeStaffCount:
            sql<number>`count(*) filter (where ${organizationMemberships.status} = 'active')::int`,
        })
        .from(organizationMemberships)
        .where(and(eq(organizationMemberships.organizationId, orgId), sql`${organizationMemberships.status} <> 'removed'`))
        .then((rows) => rows[0]),
      db
        .select({
          nearExpiryBatchCount: sql<number>`count(*)::int`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            sql`${inventoryBatches.expiresAt}::date >= ${todaySql}`,
            sql`${inventoryBatches.expiresAt}::date <= (${todaySql} + interval '30 days')`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          batchesAtRisk: sql<number>`count(*)::int`,
          unitsAtRisk: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`,
          costValueCents: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable} * ${inventoryBatches.unitOrderPriceCents}), 0)::int`,
          retailValueCents: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable} * coalesce(${inventoryBatches.unitSalePriceCents}, ${products.defaultSellingPriceCents})), 0)::int`,
        })
        .from(inventoryBatches)
        .innerJoin(products, eq(products.id, inventoryBatches.productId))
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            sql`${inventoryBatches.expiresAt}::date >= ${todaySql}`,
            sql`${inventoryBatches.expiresAt}::date <= (${todaySql} + interval '30 days')`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .then((rows) => rows[0]),
      db
        .select({
          branchId: inventoryBatches.branchId,
          lowStockSkuCount: sql<number>`count(distinct ${inventoryBatches.productId})::int`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            // reuse the same heuristic from network: "low stock" is domain-specific; we approximate by batches with <= 3 units
            sql`${inventoryBatches.quantityAvailable} <= 3`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .groupBy(inventoryBatches.branchId),
      db
        .select({
          branchId: inventoryBatches.branchId,
          healthyBatchRatio: sql<number>`case when count(*) = 0 then 0 else round(100.0 * (count(*) filter (where ${inventoryBatches.status} <> 'disposed' and ${inventoryBatches.quantityAvailable} > 0 and ${inventoryBatches.expiresAt}::date > (${todaySql} + interval '30 days'))::decimal / count(*)::decimal))::int end`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .groupBy(inventoryBatches.branchId),
      db
        .select({
          date: sql<string>`to_char(${sales.createdAt} at time zone ${timeZone}, 'YYYY-MM-DD')`,
          revenueCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          salesCount: sql<number>`count(*)::int`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${ninetyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
            ...branchSalesWhere,
          ),
        )
        .groupBy(sql`(${sales.createdAt} at time zone ${timeZone})::date`)
        .orderBy(asc(sql`(${sales.createdAt} at time zone ${timeZone})::date`)),
      db
        .select({
          date: sql<string>`to_char(${inventoryTransactions.occurredAt} at time zone ${timeZone}, 'YYYY-MM-DD')`,
          unitsSold: sql<number>`coalesce(sum(abs(${inventoryTransactions.quantityDelta})), 0)::int`,
        })
        .from(inventoryTransactions)
        .where(
          and(
            eq(inventoryTransactions.organizationId, orgId),
            eq(inventoryTransactions.transactionType, "sale"),
            sql`${inventoryTransactions.occurredAt} >= ${ninetyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, inventoryTransactions.branchId)
              ? [branchScopeWhere(context, inventoryTransactions.branchId)!]
              : []),
            ...branchTxnWhere,
          ),
        )
        .groupBy(sql`(${inventoryTransactions.occurredAt} at time zone ${timeZone})::date`)
        .orderBy(asc(sql`(${inventoryTransactions.occurredAt} at time zone ${timeZone})::date`)),
      db
        .select({
          date: sql<string>`(${inventoryBatches.expiresAt} at time zone 'utc')::date::text`,
          nearExpiryBatchCount: sql<number>`count(*)::int`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            sql`${inventoryBatches.expiresAt}::date >= ${todaySql}`,
            sql`${inventoryBatches.expiresAt}::date <= (${todaySql} + interval '30 days')`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .groupBy(sql`(${inventoryBatches.expiresAt} at time zone 'utc')::date`)
        .orderBy(asc(sql`(${inventoryBatches.expiresAt} at time zone 'utc')::date`)),
      db
        .select({
          name: products.name,
          unitsSold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(products.id, saleItems.productId))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
            ...branchSalesWhere,
          ),
        )
        .groupBy(products.name)
        .orderBy(desc(sql`coalesce(sum(${saleItems.quantity}), 0)`))
        .limit(6),
      db
        .select({
          name: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
          unitsSold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(products.id, saleItems.productId))
        .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
            ...branchSalesWhere,
          ),
        )
        .groupBy(sql`coalesce(${productCategories.name}, 'Uncategorized')`)
        .orderBy(desc(sql`coalesce(sum(${saleItems.quantity}), 0)`))
        .limit(6),
      db
        .select({
          productId: sql<string>`${saleItems.productId}`,
          productName: products.name,
          sku: products.sku,
          categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
          unitsSold: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(products.id, saleItems.productId))
        .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
        .where(
          and(
            eq(sales.organizationId, orgId),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ...(branchScopeWhere(context, sales.branchId) ? [branchScopeWhere(context, sales.branchId)!] : []),
            ...branchSalesWhere,
          ),
        )
        .groupBy(saleItems.productId, products.name, products.sku, sql`coalesce(${productCategories.name}, 'Uncategorized')`)
        .orderBy(desc(sql`coalesce(sum(${saleItems.quantity}), 0)`))
        .limit(12),
      db
        .select({
          productId: sql<string>`${inventoryBatches.productId}`,
          availableUnits: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`,
        })
        .from(inventoryBatches)
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .groupBy(inventoryBatches.productId),
      db
        .select({
          productId: sql<string>`${inventoryBatches.productId}`,
          unitPriceCents: sql<number>`coalesce(max(coalesce(${inventoryBatches.unitSalePriceCents}, ${products.defaultSellingPriceCents})), 0)::int`,
        })
        .from(inventoryBatches)
        .innerJoin(products, eq(products.id, inventoryBatches.productId))
        .where(
          and(
            eq(inventoryBatches.organizationId, orgId),
            sql`${inventoryBatches.status} <> 'disposed'`,
            sql`${inventoryBatches.quantityAvailable} > 0`,
            ...(branchScopeWhere(context, inventoryBatches.branchId)
              ? [branchScopeWhere(context, inventoryBatches.branchId)!]
              : []),
            ...branchBatchWhere,
          ),
        )
        .groupBy(inventoryBatches.productId),
    ]);

    const revenueCents30d = Number(salesAggRow?.revenueCents30d ?? 0);
    const salesCount30d = Number(salesAggRow?.salesCount30d ?? 0);
    const unitsSold30d = Number(unitsAggRow?.unitsSold30d ?? 0);
    const activeStaffCount = Number(staffAggRow?.activeStaffCount ?? 0);
    const nearExpiryBatchCount = Number(nearExpiryRow?.nearExpiryBatchCount ?? 0);
    const nearExpiryValue = {
      batchesAtRisk: Number(nearExpiryValueRow?.batchesAtRisk ?? 0),
      unitsAtRisk: Number(nearExpiryValueRow?.unitsAtRisk ?? 0),
      costValueCents: Number(nearExpiryValueRow?.costValueCents ?? 0),
      estimatedRetailValueCents: Number(nearExpiryValueRow?.retailValueCents ?? 0),
    };

    const lowStockByBranch = new Map(lowStockByBranchRows.map((r) => [r.branchId, Number(r.lowStockSkuCount ?? 0)]));
    const healthByBranch = new Map(healthByBranchRows.map((r) => [r.branchId, Number(r.healthyBatchRatio ?? 0)]));

    const salesTrendByDate = new Map<string, { revenueCents: number; salesCount: number }>(
      salesTrendRows.map((r) => [r.date, { revenueCents: Number(r.revenueCents ?? 0), salesCount: Number(r.salesCount ?? 0) }]),
    );
    const unitsTrendByDate = new Map<string, number>(unitsTrendRows.map((r) => [r.date, Number(r.unitsSold ?? 0)]));
    const nearExpiryTrendByDate = new Map<string, number>(
      nearExpiryTrendRows.map((r) => [r.date, Number(r.nearExpiryBatchCount ?? 0)]),
    );

    const salesTrend: InsightsTrendPoint[] = [];
    // Walk the store's calendar days so the skeleton lines up with the buckets.
    for (let i = 0; i < 90; i += 1) {
      const iso = storeDateKey(addStoreDays(today, i - 90, timeZone), timeZone);
      const salesRow = salesTrendByDate.get(iso);
      salesTrend.push({
        date: iso,
        revenueCents: salesRow?.revenueCents ?? 0,
        unitsSold: unitsTrendByDate.get(iso) ?? 0,
        salesCount: salesRow?.salesCount ?? 0,
      });
    }

    const inventoryHealthTrend: InsightsInventoryHealthPoint[] = [];
    // Walk the store's calendar days so the skeleton lines up with the buckets.
    for (let i = 0; i < 90; i += 1) {
      const iso = storeDateKey(addStoreDays(today, i - 90, timeZone), timeZone);
      // lowStockSkuCount/healthyBatchRatio are more “current-state” than daily; we keep them stable for now.
      const lowStockSkuCountScoped = branchId
        ? lowStockByBranch.get(branchId) ?? 0
        : [...lowStockByBranch.values()].reduce((a, b) => a + b, 0);
      const healthyBatchRatioScoped = branchId
        ? healthByBranch.get(branchId) ?? 0
        : scopedBranches.length
          ? Math.round(
              scopedBranches.reduce((sum, b) => sum + (healthByBranch.get(b.id) ?? 0), 0) / scopedBranches.length,
            )
          : 0;
      inventoryHealthTrend.push({
        date: iso,
        nearExpiryBatchCount: nearExpiryTrendByDate.get(iso) ?? 0,
        lowStockSkuCount: lowStockSkuCountScoped,
        healthyBatchRatio: healthyBatchRatioScoped,
      });
    }

    const operationsTrend: InsightsOperationsPoint[] = [];
    // Walk the store's calendar days so the skeleton lines up with the buckets.
    for (let i = 0; i < 90; i += 1) {
      const iso = storeDateKey(addStoreDays(today, i - 90, timeZone), timeZone);
      const salesRow = salesTrendByDate.get(iso);
      operationsTrend.push({
        date: iso,
        salesCount: salesRow?.salesCount ?? 0,
        activeStaffCount,
      });
    }

    const dispensing: InsightsDispensingSnapshot = {
      topMedications: dispensingTopMedRows.map((r) => ({ name: r.name, unitsSold: Number(r.unitsSold ?? 0) })),
      topCategories: dispensingTopCategoryRows.map((r) => ({ name: r.name, unitsSold: Number(r.unitsSold ?? 0) })),
    };

    const FORECAST_WINDOW_DAYS = 30;
    const TARGET_COVER_DAYS = 30;
    const REORDER_WHEN_BELOW_DAYS_COVER = 14;

    const availabilityByProduct = new Map<string, number>(
      availabilityRows.map((r) => [r.productId, Number(r.availableUnits ?? 0)]),
    );
    const priceByProduct = new Map<string, number>(
      forecastPriceRows.map((r) => [r.productId, Number(r.unitPriceCents ?? 0)]),
    );

    const forecastItems = forecastRows.map((r) => {
      const unitsSoldWindow = Number(r.unitsSold ?? 0);
      const avgDailyUnits = unitsSoldWindow / FORECAST_WINDOW_DAYS;
      const availableUnits = availabilityByProduct.get(r.productId) ?? 0;
      const daysOfCover = avgDailyUnits > 0 ? availableUnits / avgDailyUnits : null;
      const suggestedOrderUnits =
        daysOfCover != null && daysOfCover < REORDER_WHEN_BELOW_DAYS_COVER
          ? Math.max(0, Math.ceil(TARGET_COVER_DAYS * avgDailyUnits - availableUnits))
          : 0;
      const estimatedUnitPriceCents = priceByProduct.get(r.productId) ?? 0;
      const estimatedOrderValueCents = suggestedOrderUnits * estimatedUnitPriceCents;

      return {
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        categoryName: r.categoryName,
        unitsSoldWindow,
        avgDailyUnits,
        availableUnits,
        daysOfCover,
        suggestedOrderUnits,
        estimatedUnitPriceCents,
        estimatedOrderValueCents,
      };
    });

    const lowStockSkusAtRisk = forecastItems.filter((i) => i.availableUnits <= 3).length;
    const estimatedLostUnitsNext30d = forecastItems.reduce((sum, item) => {
      const expected = Math.round(item.avgDailyUnits * 30);
      if (expected <= 0) return sum;
      return sum + Math.max(0, expected - item.availableUnits);
    }, 0);
    const estimatedLostRevenueCentsNext30d = forecastItems.reduce((sum, item) => {
      const expected = item.avgDailyUnits * 30;
      if (expected <= 0) return sum;
      const lost = Math.max(0, Math.ceil(expected - item.availableUnits));
      return sum + lost * item.estimatedUnitPriceCents;
    }, 0);

    const dimensions: InsightsHeatmapDimension[] = ["lowStock", "nearExpiry", "batchHealthRisk"];
    const nearExpiryByBranchRows = await db
      .select({
        branchId: inventoryBatches.branchId,
        nearExpiryBatchCount: sql<number>`count(*)::int`,
      })
      .from(inventoryBatches)
      .where(
        and(
          eq(inventoryBatches.organizationId, orgId),
          sql`${inventoryBatches.status} <> 'disposed'`,
          sql`${inventoryBatches.quantityAvailable} > 0`,
          sql`${inventoryBatches.expiresAt}::date >= ${todaySql}`,
          sql`${inventoryBatches.expiresAt}::date <= (${todaySql} + interval '30 days')`,
          ...(branchScopeWhere(context, inventoryBatches.branchId) ? [branchScopeWhere(context, inventoryBatches.branchId)!] : []),
          ...branchBatchWhere,
        ),
      )
      .groupBy(inventoryBatches.branchId);
    const nearExpiryByBranch = new Map(
      nearExpiryByBranchRows.map((r) => [r.branchId, Number(r.nearExpiryBatchCount ?? 0)]),
    );

    const rows: InsightsHeatmapRow[] = scopedBranches.map((b) => {
      const lowStock = lowStockByBranch.get(b.id) ?? 0;
      const nearExpiry = nearExpiryByBranch.get(b.id) ?? 0;
      const healthyRatio = healthByBranch.get(b.id) ?? 0;
      const batchHealthRisk = Math.max(0, 100 - healthyRatio);

      const cells: InsightsHeatmapCell[] = [
        { dimension: "lowStock", value: lowStock, intensity: 0 },
        { dimension: "nearExpiry", value: nearExpiry, intensity: 0 },
        { dimension: "batchHealthRisk", value: batchHealthRisk, intensity: 0 },
      ];
      return { branchId: b.id, branchName: b.name, cells };
    });

    const maxLowStock = Math.max(0, ...rows.map((r) => r.cells.find((c) => c.dimension === "lowStock")?.value ?? 0));
    const maxNearExpiry = Math.max(
      0,
      ...rows.map((r) => r.cells.find((c) => c.dimension === "nearExpiry")?.value ?? 0),
    );
    const maxBatchHealthRisk = Math.max(
      0,
      ...rows.map((r) => r.cells.find((c) => c.dimension === "batchHealthRisk")?.value ?? 0),
    );

    for (const row of rows) {
      for (const cell of row.cells) {
        const max =
          cell.dimension === "lowStock"
            ? maxLowStock
            : cell.dimension === "nearExpiry"
              ? maxNearExpiry
              : maxBatchHealthRisk;
        cell.intensity = normalizeIntensity(cell.value, max);
      }
    }

    // KPIs: low-stock aggregated is sum of branch distinct counts; good enough for UI-level indicator.
    const lowStockSkuCount =
      branchId != null
        ? lowStockByBranch.get(branchId) ?? 0
        : [...lowStockByBranch.values()].reduce((a, b) => a + b, 0);

    const geoBranches = scopedBranches.map((b) => {
      const row = rows.find((r) => r.branchId === b.id);
      const intensitySum = row
        ? row.cells.reduce((sum, c) => sum + (c.intensity ?? 0), 0)
        : 0;
      const riskScore = Math.round(intensitySum / Math.max(1, dimensions.length));
      const riskLabel: "low" | "medium" | "high" =
        riskScore >= 67 ? "high" : riskScore >= 34 ? "medium" : "low";
      return {
        branchId: b.id,
        branchName: b.name,
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
        riskScore,
        riskLabel,
      };
    });

    return {
      scope: { branchId },
      kpis: {
        revenueCents30d,
        unitsSold30d,
        salesCount30d,
        nearExpiryBatchCount,
        lowStockSkuCount,
        activeStaffCount,
      },
      forecast: {
        assumptions: {
          windowDays: FORECAST_WINDOW_DAYS,
          targetCoverDays: TARGET_COVER_DAYS,
          reorderWhenBelowDaysCover: REORDER_WHEN_BELOW_DAYS_COVER,
        },
        items: forecastItems,
      },
      riskToRevenue: {
        nearExpiry: nearExpiryValue,
        lowStock: {
          skusAtRisk: lowStockSkusAtRisk,
          estimatedLostUnitsNext30d,
          estimatedLostRevenueCentsNext30d,
        },
      },
      trends: {
        sales: salesTrend,
        inventoryHealth: inventoryHealthTrend,
        operations: operationsTrend,
      },
      dispensing,
      geo: {
        branches: geoBranches,
      },
      heatmap: { dimensions, rows },
    };
  }
}

export const insightsRepository: InsightsRepository = new InsightsRepositoryImpl();

