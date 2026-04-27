import { and, asc, count, desc, eq, inArray, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  expenses,
  inventoryBatches,
  inventoryTransactions,
  patients,
  payments,
  productCategories,
  products,
  saleItems,
  sales,
  walletAccounts,
  walletLedgerEntries,
} from "@/lib/db/schema";
import type { CreateSaleInput } from "@/lib/validation/sales";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import { utcMonthRangeForInstant } from "@/lib/dates/utc-month-range";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import type {
  SalesCatalogData,
  SalesDashboardData,
  SalesDateRange,
  SalesRecentSalesData,
  SalesRepository,
} from "@/lib/repositories/sales/sales.repository";

type ResolvedBranch = typeof branches.$inferSelect;

function clampPageSize(value: number | undefined, fallback: number) {
  if (!value || value < 1) {
    return fallback;
  }

  return Math.min(Math.floor(value), 50);
}

function normalizeDate(value: string | Date) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

function differenceInDays(target: Date, base: Date) {
  return Math.ceil((target.getTime() - base.getTime()) / 86_400_000);
}

function moneyToCents(value: number) {
  return Math.round(value * 100);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

async function loadBranchesForOrg(organizationId: string) {
  return db.query.branches.findMany({
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function branchesVisibleInContext(context: AuthContext) {
  const all = await loadBranchesForOrg(context.organization.id);
  return filterBranchesForContext(context, all);
}

function pickResolvedBranch(
  context: AuthContext,
  preferredBranchId: string | undefined,
  availableBranches: ResolvedBranch[],
) {
  const branch =
    (preferredBranchId
      ? availableBranches.find((candidate) => candidate.id === preferredBranchId) ?? null
      : null) ??
    (context.onboarding?.mainBranchId
      ? availableBranches.find((candidate) => candidate.id === context.onboarding?.mainBranchId) ?? null
      : null) ??
    availableBranches.find((candidate) => candidate.isPrimary) ??
    availableBranches[0];

  if (!branch) {
    throw new Error("Finish branch setup before using sales.");
  }

  return branch;
}

async function resolveBranchContext(context: AuthContext, preferredBranchId?: string) {
  const branchOptions = await branchesVisibleInContext(context);
  if (!branchOptions.length) {
    throw new Error("No branch access assigned for your account.");
  }
  return {
    branch: pickResolvedBranch(context, preferredBranchId, branchOptions),
    branchOptions,
  };
}

async function resolveBranch(context: AuthContext, preferredBranchId?: string) {
  return (await resolveBranchContext(context, preferredBranchId)).branch;
}

function buildSaleNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `SAL-${datePart}-${randomPart}`;
}

function deriveBatchStatus(
  currentStatus: string,
  expiresAt: string | Date,
  quantityAvailable: number,
  today: Date,
) {
  if (currentStatus === "disposed") {
    return "disposed" as const;
  }

  if (currentStatus === "quarantined" && quantityAvailable > 0) {
    return "quarantined" as const;
  }

  if (quantityAvailable <= 0) {
    return "depleted" as const;
  }

  const expiryDate = normalizeDate(expiresAt);
  if (differenceInDays(expiryDate, today) < 0) {
    return "expired" as const;
  }

  return "active" as const;
}

export class SalesRepositoryImpl implements SalesRepository {
  async getDashboard(context: AuthContext, branchId?: string, range?: SalesDateRange): Promise<SalesDashboardData> {
    const { branch, branchOptions } = await resolveBranchContext(context, branchId);

    const endInclusive = normalizeDate(range?.end ?? startOfTodayUtc());
    const startInclusive = normalizeDate(range?.start ?? addDaysUtc(endInclusive, -29));
    const endExclusive = addDaysUtc(endInclusive, 1);

    const windowMs = endExclusive.getTime() - startInclusive.getTime();
    const previousEndExclusive = startInclusive;
    const previousStartInclusive = new Date(previousEndExclusive.getTime() - windowMs);

    const startIso = startInclusive.toISOString();
    const endExclusiveIso = endExclusive.toISOString();
    const prevStartIso = previousStartInclusive.toISOString();
    const prevEndExclusiveIso = previousEndExclusive.toISOString();

    const [
      metricsRows,
      cogsRows,
      chargeExpenseRows,
      topProductsRows,
      branchRevenueRows,
      unitsRows,
      trendRows,
    ] =
      await Promise.all([
        db
          .select({
            totalRevenueCents:
              sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
            previousRevenueCents:
              sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${prevStartIso}::timestamptz and ${sales.createdAt} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
            totalSalesCount:
              sql<number>`coalesce(count(*) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
            averageOrderValueCents:
              sql<number>`coalesce(round(avg(${sales.totalCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz)), 0)::int`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ),
          ),
        db
          .select({
            totalCogsCents:
              sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
            previousCogsCents:
              sql<number>`coalesce(sum(${saleItems.quantity} * ${inventoryBatches.unitOrderPriceCents}) filter (where ${sales.createdAt} >= ${prevStartIso}::timestamptz and ${sales.createdAt} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .innerJoin(inventoryBatches, eq(saleItems.batchId, inventoryBatches.id))
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ),
          ),
        db
          .select({
            totalExpensesCents:
              sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
            previousExpensesCents:
              sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseDate} >= ${prevStartIso}::timestamptz and ${expenses.expenseDate} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
            totalChargeExpensesCents:
              sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'charge' and ${expenses.expenseDate} >= ${startIso}::timestamptz and ${expenses.expenseDate} < ${endExclusiveIso}::timestamptz), 0)::int`,
            previousChargeExpensesCents:
              sql<number>`coalesce(sum(${expenses.amountCents}) filter (where ${expenses.expenseType} = 'charge' and ${expenses.expenseDate} >= ${prevStartIso}::timestamptz and ${expenses.expenseDate} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
          })
          .from(expenses)
          .where(
            and(
              eq(expenses.organizationId, context.organization.id),
              eq(expenses.branchId, branch.id),
              sql`${expenses.expenseDate} >= ${prevStartIso}::timestamptz`,
            ),
          ),
        db
          .select({
            productId: products.id,
            productName: products.name,
            amountCents: sql<number>`coalesce(sum(${saleItems.lineTotalCents}), 0)::int`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .innerJoin(products, eq(saleItems.productId, products.id))
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${startIso}::timestamptz`,
              sql`${sales.createdAt} < ${endExclusiveIso}::timestamptz`,
            ),
          )
          .groupBy(products.id, products.name)
          .orderBy(desc(sql`coalesce(sum(${saleItems.lineTotalCents}), 0)`))
          .limit(4),
        db
          .select({
            branchId: sales.branchId,
            branchName: branches.name,
            amountCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          })
          .from(sales)
          .innerJoin(branches, eq(sales.branchId, branches.id))
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${startIso}::timestamptz`,
              sql`${sales.createdAt} < ${endExclusiveIso}::timestamptz`,
            ),
          )
          .groupBy(sales.branchId, branches.name),
        db
          .select({
            unitsSoldLast30Days:
              sql<number>`coalesce(sum(${saleItems.quantity}) filter (where ${sales.createdAt} >= ${startIso}::timestamptz and ${sales.createdAt} < ${endExclusiveIso}::timestamptz), 0)::int`,
            previousUnitsSoldLast30Days:
              sql<number>`coalesce(sum(${saleItems.quantity}) filter (where ${sales.createdAt} >= ${prevStartIso}::timestamptz and ${sales.createdAt} < ${prevEndExclusiveIso}::timestamptz), 0)::int`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${prevStartIso}::timestamptz`,
            ),
          ),
        db.execute(sql`
          with days as (
            select generate_series(
              date_trunc('day', ${startIso}::timestamptz),
              date_trunc('day', ${endExclusiveIso}::timestamptz) - interval '1 day',
              interval '1 day'
            ) as day
          ),
          revenue as (
            select date_trunc('day', ${sales.createdAt}) as day,
                   coalesce(sum(${sales.totalCents}), 0)::int as revenue_cents
            from ${sales}
            where ${sales.organizationId} = ${context.organization.id}
              and ${sales.branchId} = ${branch.id}
              and ${sales.status} = 'completed'
              and ${sales.createdAt} >= ${startIso}::timestamptz
              and ${sales.createdAt} < ${endExclusiveIso}::timestamptz
            group by 1
          ),
          units as (
            select date_trunc('day', ${sales.createdAt}) as day,
                   coalesce(sum(${saleItems.quantity}), 0)::int as units_sold
            from ${saleItems}
            inner join ${sales} on ${saleItems.saleId} = ${sales.id}
            where ${sales.organizationId} = ${context.organization.id}
              and ${sales.branchId} = ${branch.id}
              and ${sales.status} = 'completed'
              and ${sales.createdAt} >= ${startIso}::timestamptz
              and ${sales.createdAt} < ${endExclusiveIso}::timestamptz
            group by 1
          )
          select d.day as day,
                 coalesce(r.revenue_cents, 0)::int as "revenueCents",
                 coalesce(u.units_sold, 0)::int as "unitsSold"
          from days d
          left join revenue r on r.day = d.day
          left join units u on u.day = d.day
          order by d.day asc
        `),
      ]);

    const metrics = metricsRows[0] ?? {
      totalRevenueCents: 0,
      previousRevenueCents: 0,
      totalSalesCount: 0,
      averageOrderValueCents: 0,
    };
    const cogsMetrics = cogsRows[0] ?? {
      totalCogsCents: 0,
      previousCogsCents: 0,
    };
    const chargeMetrics = chargeExpenseRows[0] ?? {
      totalExpensesCents: 0,
      previousExpensesCents: 0,
      totalChargeExpensesCents: 0,
      previousChargeExpensesCents: 0,
    };
    const topTotal = topProductsRows.reduce((sum, row) => sum + row.amountCents, 0);
    const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
    const trendRawUnknown: unknown = trendRows;
    const trendRaw: Array<{ day: unknown; revenueCents: unknown; unitsSold: unknown }> = Array.isArray(trendRawUnknown)
      ? (trendRawUnknown as Array<{ day: unknown; revenueCents: unknown; unitsSold: unknown }>)
      : typeof trendRawUnknown === "object" && trendRawUnknown && "rows" in trendRawUnknown
        ? (((trendRawUnknown as { rows?: unknown }).rows ?? []) as Array<{
            day: unknown;
            revenueCents: unknown;
            unitsSold: unknown;
          }>)
        : [];

    const trend = trendRaw.map((row) => ({
      label: dateLabelFormatter.format(row.day instanceof Date ? row.day : new Date(String(row.day))),
      revenueCents: Number(row.revenueCents ?? 0),
      unitsSold: Number(row.unitsSold ?? 0),
    }));
    const units = unitsRows[0] ?? { unitsSoldLast30Days: 0, previousUnitsSoldLast30Days: 0 };
    const branchRevenueById = new Map(branchRevenueRows.map((row) => [row.branchId, row]));
    const branchDistributionExpanded = branchOptions.map((branchOption) => {
      const row = branchRevenueById.get(branchOption.id);
      return {
        branchId: branchOption.id,
        name: branchOption.name,
        amountCents: row?.amountCents ?? 0,
      };
    });
    const branchTotalRevenueExpanded = branchDistributionExpanded.reduce((sum, row) => sum + row.amountCents, 0);
    const grossProfitBeforeExpensesCents = metrics.totalRevenueCents - cogsMetrics.totalCogsCents;
    const previousGrossProfitBeforeExpensesCents = metrics.previousRevenueCents - cogsMetrics.previousCogsCents;

    return {
      branch: {
        id: branch.id,
        name: branch.name,
      },
      branches: branchOptions.map((branchOption) => ({
        id: branchOption.id,
        name: branchOption.name,
        isPrimary: branchOption.isPrimary,
      })),
      metrics: {
        totalRevenueCents: metrics.totalRevenueCents,
        previousRevenueCents: metrics.previousRevenueCents,
        totalCogsCents: cogsMetrics.totalCogsCents,
        previousCogsCents: cogsMetrics.previousCogsCents,
        totalExpensesCents: chargeMetrics.totalExpensesCents,
        previousExpensesCents: chargeMetrics.previousExpensesCents,
        totalChargeExpensesCents: chargeMetrics.totalChargeExpensesCents,
        previousChargeExpensesCents: chargeMetrics.previousChargeExpensesCents,
        grossProfitBeforeExpensesCents,
        previousGrossProfitBeforeExpensesCents,
        grossProfitCents: grossProfitBeforeExpensesCents - chargeMetrics.totalExpensesCents,
        previousGrossProfitCents:
          previousGrossProfitBeforeExpensesCents - chargeMetrics.previousExpensesCents,
        totalSalesCount: metrics.totalSalesCount,
        averageOrderValueCents: metrics.averageOrderValueCents,
        unitsSoldLast30Days: units.unitsSoldLast30Days,
        previousUnitsSoldLast30Days: units.previousUnitsSoldLast30Days,
      },
      topProducts: topProductsRows.map((row) => ({
        productId: row.productId,
        name: row.productName,
        amountCents: row.amountCents,
        pct: topTotal > 0 ? Math.max(1, Math.round((row.amountCents / topTotal) * 100)) : 0,
      })),
      branchDistribution: branchDistributionExpanded.map((row) => ({
        branchId: row.branchId,
        name: row.name,
        amountCents: row.amountCents,
        pct:
          branchTotalRevenueExpanded > 0
            ? Math.round((row.amountCents / branchTotalRevenueExpanded) * 100)
            : 0,
      })),
      trend,
    };
  }

  async getRecentSales(context: AuthContext, branchId?: string): Promise<SalesRecentSalesData> {
    const branch = await resolveBranch(context, branchId);

    const rows = await db
      .select({
        id: sales.id,
        saleNumber: sales.saleNumber,
        totalCents: sales.totalCents,
        createdAt: sales.createdAt,
        patientName: patients.fullName,
      })
      .from(sales)
      .leftJoin(patients, eq(sales.patientId, patients.id))
      .where(
        and(
          eq(sales.organizationId, context.organization.id),
          eq(sales.branchId, branch.id),
          eq(sales.status, "completed"),
        ),
      )
      .orderBy(desc(sales.createdAt))
      .limit(5);

    return rows.map((row) => ({
      id: row.id,
      saleNumber: row.saleNumber,
      patientName: row.patientName,
      createdAt: row.createdAt.toISOString(),
      totalCents: row.totalCents,
    }));
  }

  async getCatalog(context: AuthContext, branchId?: string, q?: string): Promise<SalesCatalogData> {
    const { branch, branchOptions } = await resolveBranchContext(context, branchId);
    const trimmed = (q ?? "").trim();
    const isSearching = trimmed.length >= 2;
    const limit = clampPageSize(isSearching ? 50 : 100, isSearching ? 50 : 100);
    const pattern = `%${trimmed}%`;

    const productRows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
        defaultSellingPriceCents: products.defaultSellingPriceCents,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(
        and(
          eq(products.organizationId, context.organization.id),
          isSearching
            ? or(
                eq(products.barcode, trimmed),
                ilike(products.name, pattern),
                ilike(products.sku, pattern),
                ilike(productCategories.name, pattern),
              )
            : sql`true`,
        ),
      )
      .orderBy(asc(products.name))
      .limit(limit);
    const productIds = productRows.map((row) => row.id);
    const batchRows =
      productIds.length > 0
        ? await db
            .select({
              id: inventoryBatches.id,
              productId: inventoryBatches.productId,
              batchNumber: inventoryBatches.batchNumber,
              expiresAt: inventoryBatches.expiresAt,
              quantityAvailable: inventoryBatches.quantityAvailable,
            })
            .from(inventoryBatches)
            .where(
              and(
                eq(inventoryBatches.organizationId, context.organization.id),
                eq(inventoryBatches.branchId, branch.id),
                eq(inventoryBatches.status, "active"),
                sql`${inventoryBatches.quantityAvailable} > 0`,
                inArray(inventoryBatches.productId, productIds),
              ),
            )
            .orderBy(asc(inventoryBatches.expiresAt))
        : [];

    const batchMap = new Map<string, SalesCatalogData["products"][number]["batches"]>();
    for (const row of batchRows) {
      const list = batchMap.get(row.productId) ?? [];
      list.push({
        id: row.id,
        batchNumber: row.batchNumber,
        expiresAt: normalizeDate(row.expiresAt).toISOString(),
        quantityAvailable: row.quantityAvailable,
      });
      batchMap.set(row.productId, list);
    }

    return {
      branch: {
        id: branch.id,
        name: branch.name,
      },
      branches: branchOptions.map((branchOption) => ({
        id: branchOption.id,
        name: branchOption.name,
        isPrimary: branchOption.isPrimary,
      })),
      products: productRows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode,
        categoryName: row.categoryName,
        defaultSellingPriceCents: row.defaultSellingPriceCents,
        batches: batchMap.get(row.id) ?? [],
      })),
    };
  }

  async createSale(context: AuthContext, input: CreateSaleInput) {
    const branch = await resolveBranch(context, input.branchId);
    const today = startOfTodayUtc();

    return db.transaction(async (tx) => {
      let patientId: string | null = null;

      if (input.patientCode || input.mobile || input.customerName) {
        const existingPatient = await tx.query.patients.findFirst({
          where: and(
            eq(patients.organizationId, context.organization.id),
            input.patientCode ? eq(patients.patientCode, input.patientCode) : sql`true`,
            input.mobile ? eq(patients.phone, input.mobile) : sql`true`,
          ),
        });

        if (existingPatient) {
          patientId = existingPatient.id;
        } else if (input.customerName) {
          const [createdPatient] = await tx
            .insert(patients)
            .values({
              organizationId: context.organization.id,
              patientCode: input.patientCode ?? `PAT-${Date.now().toString().slice(-6)}`,
              fullName: input.customerName,
              phone: input.mobile,
            })
            .returning();
          patientId = createdPatient.id;
        }
      }

      const productIds = uniqueStrings(input.items.map((item) => item.productId));
      const productRows = await tx
        .select({
          id: products.id,
          name: products.name,
        })
        .from(products)
        .where(and(eq(products.organizationId, context.organization.id), inArray(products.id, productIds)));

      if (productRows.length !== productIds.length) {
        throw new Error("One or more selected products are invalid.");
      }

      const productMap = new Map(productRows.map((row) => [row.id, row]));
      const requestedBatchIds = uniqueStrings(
        input.items
          .map((item) => item.batchId)
          .filter((batchId): batchId is string => Boolean(batchId)),
      );
      const autoAssignedProductIds = uniqueStrings(
        input.items.filter((item) => !item.batchId).map((item) => item.productId),
      );
      const explicitBatchRows =
        requestedBatchIds.length > 0
          ? await tx
              .select({
                id: inventoryBatches.id,
                productId: inventoryBatches.productId,
                batchNumber: inventoryBatches.batchNumber,
                quantityAvailable: inventoryBatches.quantityAvailable,
                expiresAt: inventoryBatches.expiresAt,
                status: inventoryBatches.status,
                unitOrderPriceCents: inventoryBatches.unitOrderPriceCents,
              })
              .from(inventoryBatches)
              .where(
                and(
                  eq(inventoryBatches.organizationId, context.organization.id),
                  eq(inventoryBatches.branchId, branch.id),
                  inArray(inventoryBatches.id, requestedBatchIds),
                ),
              )
          : [];
      const openBatchesByProduct =
        autoAssignedProductIds.length > 0
          ? await tx
              .select({
                id: inventoryBatches.id,
                productId: inventoryBatches.productId,
                batchNumber: inventoryBatches.batchNumber,
                quantityAvailable: inventoryBatches.quantityAvailable,
                expiresAt: inventoryBatches.expiresAt,
                status: inventoryBatches.status,
                unitOrderPriceCents: inventoryBatches.unitOrderPriceCents,
              })
              .from(inventoryBatches)
              .where(
                and(
                  eq(inventoryBatches.organizationId, context.organization.id),
                  eq(inventoryBatches.branchId, branch.id),
                  eq(inventoryBatches.status, "active"),
                  sql`${inventoryBatches.quantityAvailable} > 0`,
                  inArray(inventoryBatches.productId, autoAssignedProductIds),
                ),
              )
              .orderBy(asc(inventoryBatches.expiresAt))
          : [];

      const openBatchMap = new Map<string, (typeof openBatchesByProduct)>();
      for (const row of openBatchesByProduct) {
        const list = openBatchMap.get(row.productId) ?? [];
        list.push(row);
        openBatchMap.set(row.productId, list);
      }

      const batchById = new Map<string, (typeof explicitBatchRows)[number]>();
      for (const row of explicitBatchRows) {
        batchById.set(row.id, row);
      }
      for (const row of openBatchesByProduct) {
        if (!batchById.has(row.id)) {
          batchById.set(row.id, row);
        }
      }

      const availableByBatch = new Map<string, number>();
      for (const row of explicitBatchRows) {
        availableByBatch.set(row.id, row.quantityAvailable);
      }
      for (const row of openBatchesByProduct) {
        if (!availableByBatch.has(row.id)) {
          availableByBatch.set(row.id, row.quantityAvailable);
        }
      }

      const preparedItems = input.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error("Invalid sale product.");
        }

        const batch =
          (item.batchId ? batchById.get(item.batchId) : null) ??
          (openBatchMap.get(item.productId)?.[0] ?? null);

        if (!batch) {
          throw new Error(`No available stock batch for ${product.name}.`);
        }

        if (batch.productId !== item.productId) {
          throw new Error(`Selected batch ${batch.batchNumber} does not belong to ${product.name}.`);
        }

        const available = availableByBatch.get(batch.id) ?? batch.quantityAvailable;

        if (input.status === "completed" && available < item.quantity) {
          throw new Error(
            `Insufficient quantity for ${product.name} in batch ${batch.batchNumber}. Available: ${available}.`,
          );
        }

        const unitPriceCents = moneyToCents(item.unitPrice);
        const lineSubtotalCents = unitPriceCents * item.quantity;
        const taxRateBps = context.organization.salesTaxEnabled ? context.organization.salesTaxRateBps : 0;
        const taxCents = Math.round((lineSubtotalCents * taxRateBps) / 10_000);
        const lineTotalCents = lineSubtotalCents + taxCents;

        if (input.status === "completed") {
          availableByBatch.set(batch.id, available - item.quantity);
        }

        return {
          productId: product.id,
          productName: product.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: item.quantity,
          unitPriceCents,
          unitOrderPriceCents: batch.unitOrderPriceCents,
          taxRateBps,
          lineSubtotalCents,
          lineTaxCents: taxCents,
          lineTotalCents,
          description: item.description ?? product.name,
          batchStatus: batch.status,
          batchExpiresAt: batch.expiresAt,
        };
      });

      const subtotalCents = preparedItems.reduce((sum, item) => sum + item.lineSubtotalCents, 0);
      const taxCents = preparedItems.reduce((sum, item) => sum + item.lineTaxCents, 0);
      const discountCents = 0;
      const totalCents = subtotalCents + taxCents - discountCents;
      const saleNumber = buildSaleNumber();

      if (input.status === "completed") {
        const { startInclusive, endExclusive } = utcMonthRangeForInstant(new Date());
        const monthStartIso = startInclusive.toISOString();
        const monthEndIso = endExclusive.toISOString();
        const [{ value: completedCount }] = await tx
          .select({ value: count() })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.status, "completed"),
              sql`coalesce(${sales.completedAt}, ${sales.createdAt}) >= ${monthStartIso}::timestamptz`,
              sql`coalesce(${sales.completedAt}, ${sales.createdAt}) < ${monthEndIso}::timestamptz`,
            ),
          );

        assertWithinLimit({
          kind: "salesTransactions",
          current: completedCount,
          limit: context.entitlements.limits.salesTransactions,
        });
      }

      const [sale] = await tx
        .insert(sales)
        .values({
          organizationId: context.organization.id,
          branchId: branch.id,
          saleNumber,
          patientId,
          servedByUserId: context.user.id,
          status: input.status,
          subtotalCents,
          taxCents,
          discountCents,
          totalCents,
          paymentStatus: input.status === "completed" ? "paid" : "pending",
          discountCode: input.discountCode,
          notes: input.notes,
          completedAt: input.status === "completed" ? new Date() : null,
        })
        .returning();

      await tx.insert(saleItems).values(
        preparedItems.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          batchId: item.batchId,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          taxRateBps: item.taxRateBps,
          discountCents: 0,
          lineSubtotalCents: item.lineSubtotalCents,
          lineTotalCents: item.lineTotalCents,
        })),
      );

      const paymentMethod =
        input.paymentMethod === "aura-pay"
          ? "aura_pay_wallet"
          : input.paymentMethod === "bank-transfer"
            ? "bank_transfer"
            : input.paymentMethod === "mobile-money"
              ? "mobile_money"
              : input.paymentMethod;

      const [payment] = await tx.insert(payments).values({
        saleId: sale.id,
        organizationId: context.organization.id,
        branchId: branch.id,
        method: paymentMethod,
        status: input.status === "completed" ? "paid" : "pending",
        reference: input.paymentReference,
        amountCents: totalCents,
        currency: "ZMW",
        paidAt: input.status === "completed" ? new Date() : null,
      }).returning();

      if (input.status === "completed" && (paymentMethod === "card" || paymentMethod === "mobile_money")) {
        const [wallet] = await tx
          .update(walletAccounts)
          .set({
            balanceCents: sql`${walletAccounts.balanceCents} + ${totalCents}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(walletAccounts.organizationId, context.organization.id),
              eq(walletAccounts.branchId, branch.id),
              eq(walletAccounts.status, "active"),
            ),
          )
          .returning();

        if (wallet) {
          await tx.insert(walletLedgerEntries).values({
            walletId: wallet.id,
            organizationId: context.organization.id,
            branchId: branch.id,
            paymentId: payment.id,
            entryType: "settlement",
            sourceMethod: paymentMethod,
            status: "posted",
            amountCents: totalCents,
            currency: "ZMW",
            reference: input.paymentReference,
            note: `Sale ${sale.saleNumber} settlement`,
            metadata: {
              saleId: sale.id,
              saleNumber: sale.saleNumber,
            },
            postedAt: new Date(),
          });
        }
      }

      if (input.status === "completed") {
        const batchUpdates = Array.from(
          preparedItems.reduce(
            (map, item) =>
              map.set(item.batchId, {
                batchId: item.batchId,
                batchStatus: item.batchStatus,
                batchExpiresAt: item.batchExpiresAt,
                nextQuantity: availableByBatch.get(item.batchId) ?? 0,
              }),
            new Map<
              string,
              {
                batchId: string;
                batchStatus: string;
                batchExpiresAt: string | Date;
                nextQuantity: number;
              }
            >(),
          ).values(),
        ).map((item) => ({
          ...item,
          nextStatus: deriveBatchStatus(item.batchStatus, item.batchExpiresAt, item.nextQuantity, today),
        }));

        if (batchUpdates.length > 0) {
          const quantityCases = sql.join(
            batchUpdates.map((item) => sql`when ${inventoryBatches.id} = ${item.batchId} then ${item.nextQuantity}`),
            sql.raw(" "),
          );
          const statusCases = sql.join(
            batchUpdates.map((item) => sql`when ${inventoryBatches.id} = ${item.batchId} then ${item.nextStatus}`),
            sql.raw(" "),
          );

          await tx
            .update(inventoryBatches)
            .set({
              quantityAvailable: sql`case ${quantityCases} else ${inventoryBatches.quantityAvailable} end`,
              status: sql`case ${statusCases} else ${inventoryBatches.status} end`,
              updatedAt: new Date(),
            })
            .where(inArray(inventoryBatches.id, batchUpdates.map((item) => item.batchId)));
        }

        await tx.insert(inventoryTransactions).values(
          preparedItems.map((item) => ({
            organizationId: context.organization.id,
            branchId: branch.id,
            productId: item.productId,
            batchId: item.batchId,
            performedByUserId: context.user.id,
            transactionType: "sale" as const,
            quantityDelta: -item.quantity,
            unitOrderPriceCents: item.unitOrderPriceCents,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Sale ${sale.saleNumber}`,
          })),
        );
      }

      return {
        id: sale.id,
        saleNumber: sale.saleNumber,
        status: sale.status,
        totalCents: sale.totalCents,
      };
    });
  }
}

export const salesRepository: SalesRepository = new SalesRepositoryImpl();
