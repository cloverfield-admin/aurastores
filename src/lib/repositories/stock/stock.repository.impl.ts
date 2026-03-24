import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  inventoryBatches,
  inventoryTransactions,
  productCategories,
  products,
  suppliers,
  users,
} from "@/lib/db/schema";
import { slugify } from "@/lib/utils/slug";
import type { CreateStockBatchInput, StockAdjustmentInput } from "@/lib/validation/stock";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type {
  StockCatalogData,
  StockDashboardData,
  StockGetCatalogOptions,
  StockGetDashboardOptions,
  StockRepository,
} from "@/lib/repositories/stock/stock.repository";

type ResolvedBranch = typeof branches.$inferSelect;
type QueryableDb = Pick<typeof db, "query">;
type StockView = "all" | "expiring";

type GetDashboardOptions = StockGetDashboardOptions;

type GetCatalogOptions = StockGetCatalogOptions;

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

function differenceInDays(target: Date, base: Date) {
  return Math.ceil((target.getTime() - base.getTime()) / 86_400_000);
}

function moneyToCents(value: number) {
  return Math.round(value * 100);
}

function buildSku(productName: string) {
  const prefix = slugify(productName).replace(/-/g, "").slice(0, 8).toUpperCase() || "PRODUCT";
  return `${prefix}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function appendNote(existing: string | null, next?: string) {
  if (!next) {
    return existing;
  }

  return existing ? `${existing}\n${next}` : next;
}

function normalizeSearchTerm(value?: string) {
  return value?.trim() ?? "";
}

function toDateStringUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** SQL filter for search — applied in the database (avoids loading all batches). */
function buildStockSearchFilter(search: string) {
  if (!search) {
    return undefined;
  }

  const pattern = `%${search}%`;

  return or(
    ilike(products.name, pattern),
    ilike(products.sku, pattern),
    ilike(inventoryBatches.batchNumber, pattern),
    sql`coalesce(${productCategories.name}, '') ilike ${pattern}`,
    sql`coalesce(${suppliers.name}, '') ilike ${pattern}`,
  );
}

/**
 * Matches UI "Expiring Soon" tab: batches at risk (derived expiring_soon ∪ expired).
 * Same as previous in-memory filter on derived status.
 */
function buildExpiringViewFilter(todayStr: string) {
  return and(
    ne(inventoryBatches.status, "disposed"),
    gt(inventoryBatches.quantityAvailable, 0),
    sql`${inventoryBatches.expiresAt}::date <= (${sql.raw(`'${todayStr}'::date + interval '30 days'`)})`,
  );
}

function mapBatchRowToInventoryItem(
  row: {
    id: string;
    batchNumber: string;
    productName: string;
    sku: string;
    categoryName: string;
    supplierName: string | null;
    expiresAt: string;
    quantityAvailable: number;
    quantityReceived: number;
    unitCostCents: number;
    unitSalePriceCents: number | null;
    status: string;
    createdAt: Date;
  },
  today: Date,
): StockDashboardData["inventory"][number] {
  const expiryDate = normalizeDate(row.expiresAt);
  const daysToExpiry = differenceInDays(expiryDate, today);
  const isDisposed = row.status === "disposed";
  const isDepleted = row.quantityAvailable <= 0 && !isDisposed;
  const isExpired = !isDisposed && daysToExpiry < 0;
  const isExpiringSoon =
    !isDisposed && !isExpired && daysToExpiry <= 30 && row.quantityAvailable > 0;

  return {
    id: row.id,
    productName: row.productName,
    sku: row.sku,
    categoryName: row.categoryName,
    supplierName: row.supplierName,
    batchNumber: row.batchNumber,
    expiresAt: expiryDate.toISOString(),
    daysToExpiry,
    quantityAvailable: row.quantityAvailable,
    quantityReceived: row.quantityReceived,
    stockProgressPercent:
      row.quantityReceived > 0
        ? Math.max(0, Math.min(100, Math.round((row.quantityAvailable / row.quantityReceived) * 100)))
        : 0,
    unitCostCents: row.unitCostCents,
    unitSalePriceCents: row.unitSalePriceCents,
    status: isDisposed
      ? "disposed"
      : isDepleted
        ? "depleted"
        : isExpired
          ? "expired"
          : isExpiringSoon
            ? "expiring_soon"
            : "active",
    canDispose: !isDisposed && row.quantityAvailable > 0,
  };
}

function clampPage(value?: number) {
  return value && value > 0 ? Math.floor(value) : 1;
}

function clampPageSize(value?: number) {
  if (!value || value < 1) {
    return 10;
  }

  return Math.min(Math.floor(value), 50);
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

async function listOrganizationBranches(organizationId: string) {
  return db.query.branches.findMany({
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function resolveBranch(context: AuthContext, preferredBranchId?: string): Promise<ResolvedBranch> {
  const availableBranches = await listOrganizationBranches(context.organization.id);

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
    throw new Error("Finish branch setup before using stock management.");
  }

  return branch;
}

async function findCategoryByName(
  tx: QueryableDb,
  organizationId: string,
  name: string,
) {
  return tx.query.productCategories.findFirst({
    where: and(
      eq(productCategories.organizationId, organizationId),
      sql`lower(${productCategories.name}) = ${name.toLowerCase()}`,
    ),
  });
}

async function findSupplierByName(
  tx: QueryableDb,
  organizationId: string,
  name: string,
) {
  return tx.query.suppliers.findFirst({
    where: and(
      eq(suppliers.organizationId, organizationId),
      sql`lower(${suppliers.name}) = ${name.toLowerCase()}`,
    ),
  });
}

async function findProductByName(
  tx: QueryableDb,
  organizationId: string,
  name: string,
) {
  return tx.query.products.findFirst({
    where: and(
      eq(products.organizationId, organizationId),
      sql`lower(${products.name}) = ${name.toLowerCase()}`,
    ),
  });
}

export class StockRepositoryImpl implements StockRepository {
  async getDashboard(
    context: AuthContext,
    options: GetDashboardOptions = {},
  ): Promise<StockDashboardData> {
    const branch = await resolveBranch(context, options.branchId);
    const branchOptions = await listOrganizationBranches(context.organization.id);
    const today = startOfTodayUtc();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);
    const search = normalizeSearchTerm(options.search);
    const page = clampPage(options.page);
    const pageSize = clampPageSize(options.pageSize);
    const view = options.view === "expiring" ? "expiring" : "all";
    const todayStr = toDateStringUtc(today);

    const branchBase = and(
      eq(inventoryBatches.organizationId, context.organization.id),
      eq(inventoryBatches.branchId, branch.id),
    );

    const searchFilter = buildStockSearchFilter(search);
    const viewFilter = view === "expiring" ? buildExpiringViewFilter(todayStr) : undefined;

    const listWhere = and(
      branchBase,
      ...(searchFilter ? [searchFilter] : []),
      ...(viewFilter ? [viewFilter] : []),
    );

    const metricsNearExpiryWhere = and(
      branchBase,
      ne(inventoryBatches.status, "disposed"),
      gt(inventoryBatches.quantityAvailable, 0),
      sql`${inventoryBatches.expiresAt}::date >= ${sql.raw(`'${todayStr}'::date`)}`,
      sql`${inventoryBatches.expiresAt}::date <= (${sql.raw(`'${todayStr}'::date`)} + interval '30 days')`,
    );

    const metricsExpiredWhere = and(
      branchBase,
      ne(inventoryBatches.status, "disposed"),
      gt(inventoryBatches.quantityAvailable, 0),
      sql`${inventoryBatches.expiresAt}::date < ${sql.raw(`'${todayStr}'::date`)}`,
    );

    const metricsActiveWhere = and(
      branchBase,
      ne(inventoryBatches.status, "disposed"),
      gt(inventoryBatches.quantityAvailable, 0),
      sql`${inventoryBatches.expiresAt}::date > (${sql.raw(`'${todayStr}'::date`)} + interval '30 days')`,
    );

    const batchSelect = {
      id: inventoryBatches.id,
      batchNumber: inventoryBatches.batchNumber,
      productName: products.name,
      sku: products.sku,
      categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
      supplierName: suppliers.name,
      expiresAt: inventoryBatches.expiresAt,
      quantityAvailable: inventoryBatches.quantityAvailable,
      quantityReceived: inventoryBatches.quantityReceived,
      unitCostCents: inventoryBatches.unitCostCents,
      unitSalePriceCents: inventoryBatches.unitSalePriceCents,
      status: inventoryBatches.status,
      createdAt: inventoryBatches.createdAt,
    };

    const inventoryJoin = () =>
      db
        .select(batchSelect)
        .from(inventoryBatches)
        .innerJoin(products, eq(inventoryBatches.productId, products.id))
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id));

    const [
      countRows,
      sumsRows,
      nearRows,
      expiredRows,
      activeRows,
      recentBatchRows,
      productStockRows,
      salesActivity,
    ] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(inventoryBatches)
        .innerJoin(products, eq(inventoryBatches.productId, products.id))
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id))
        .where(listWhere),
      db
        .select({
          totalStockValueCents: sql`coalesce(sum(${inventoryBatches.quantityAvailable} * ${inventoryBatches.unitCostCents}), 0)::bigint`,
          totalAvailableUnits: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`,
          totalBatchCount: sql<number>`count(*)::int`,
        })
        .from(inventoryBatches)
        .where(branchBase),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(inventoryBatches)
        .where(metricsNearExpiryWhere),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(inventoryBatches)
        .where(metricsExpiredWhere),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(inventoryBatches)
        .where(metricsActiveWhere),
      db
        .select({
          id: inventoryBatches.id,
          productName: products.name,
          batchNumber: inventoryBatches.batchNumber,
          quantityReceived: inventoryBatches.quantityReceived,
          createdAt: inventoryBatches.createdAt,
        })
        .from(inventoryBatches)
        .innerJoin(products, eq(inventoryBatches.productId, products.id))
        .where(branchBase)
        .orderBy(desc(inventoryBatches.createdAt))
        .limit(3),
      db
        .select({
          productId: products.id,
          productName: products.name,
          reorderLevel: products.reorderLevel,
          totalAvailable: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`,
        })
        .from(products)
        .leftJoin(
          inventoryBatches,
          and(eq(inventoryBatches.productId, products.id), eq(inventoryBatches.branchId, branch.id)),
        )
        .where(eq(products.organizationId, context.organization.id))
        .groupBy(products.id, products.name, products.reorderLevel),
      db
        .select({
          unitsSold: sql<number>`coalesce(sum(abs(${inventoryTransactions.quantityDelta})), 0)::int`,
        })
        .from(inventoryTransactions)
        .where(
          and(
            eq(inventoryTransactions.organizationId, context.organization.id),
            eq(inventoryTransactions.branchId, branch.id),
            eq(inventoryTransactions.transactionType, "sale"),
            sql`${inventoryTransactions.occurredAt} >= ${thirtyDaysAgo.toISOString()}`,
          ),
        ),
    ]);

    const countRow = countRows[0];
    const sumsRow = sumsRows[0];
    const nearRow = nearRows[0];
    const expiredRow = expiredRows[0];
    const activeRow = activeRows[0];

    const totalItems = Number(countRow?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const offset = (normalizedPage - 1) * pageSize;

    const pagedRows = await inventoryJoin()
      .where(listWhere)
      .orderBy(asc(inventoryBatches.expiresAt), desc(inventoryBatches.createdAt))
      .limit(pageSize)
      .offset(offset);

    const pagedInventory = pagedRows.map((row) => mapBatchRowToInventoryItem(row, today));

    const totalStockValueCents = Number(sumsRow?.totalStockValueCents ?? 0);
    const totalAvailableUnits = Number(sumsRow?.totalAvailableUnits ?? 0);
    const totalBatchCount = Number(sumsRow?.totalBatchCount ?? 0);
    const nearExpiryBatchCount = Number(nearRow?.c ?? 0);
    const expiredBatchCount = Number(expiredRow?.c ?? 0);
    const activeBatchCount = Number(activeRow?.c ?? 0);

    const outOfStockProducts = productStockRows.filter((row) => row.totalAvailable <= 0);
    const lowStockProducts = productStockRows.filter(
      (row) => row.reorderLevel > 0 && row.totalAvailable > 0 && row.totalAvailable <= row.reorderLevel,
    );
    const reorderCandidates = productStockRows.filter(
      (row) => row.totalAvailable <= Math.max(row.reorderLevel, 1),
    );

    const healthyBatchRatio =
      totalBatchCount > 0 ? Math.round((activeBatchCount / totalBatchCount) * 100) : 0;
    const unitsSoldLast30Days = salesActivity[0]?.unitsSold ?? 0;
    const stockTurnoverRate =
      totalAvailableUnits > 0 ? Number((unitsSoldLast30Days / totalAvailableUnits).toFixed(1)) : 0;

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
      lastSyncedAt: new Date().toISOString(),
      filters: {
        search,
        view,
      },
      pagination: {
        page: normalizedPage,
        pageSize,
        totalItems,
        totalPages,
      },
      metrics: {
        totalStockValueCents,
        totalAvailableUnits,
        totalBatchCount,
        nearExpiryBatchCount,
        expiredBatchCount,
        outOfStockSkuCount: outOfStockProducts.length,
        lowStockSkuCount: lowStockProducts.length,
        reorderSuggestedCount: reorderCandidates.length,
        stockTurnoverRate,
        healthyBatchRatio,
        unitsSoldLast30Days,
      },
      inventory: pagedInventory,
      recentEntries: recentBatchRows.map((row) => ({
        id: row.id,
        productName: row.productName,
        batchNumber: row.batchNumber,
        quantityReceived: row.quantityReceived,
        createdAt: row.createdAt.toISOString(),
      })),
      draftOrder: {
        branchName: branch.name,
        productCount: reorderCandidates.length,
        products: reorderCandidates.slice(0, 4).map((row) => row.productName),
      },
    };
  }

  async getCatalog(
    context: AuthContext,
    options: GetCatalogOptions = {},
  ): Promise<StockCatalogData> {
    const branch = await resolveBranch(context, options.branchId);
    const branchOptions = await listOrganizationBranches(context.organization.id);
    const [supplierRows, productRows, dashboard] = await Promise.all([
      db.query.suppliers.findMany({
        where: and(eq(suppliers.organizationId, context.organization.id), eq(suppliers.status, "active")),
        orderBy: (supplierTable, { asc: orderAsc }) => [orderAsc(supplierTable.name)],
      }),
      db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
          defaultSellingPriceCents: products.defaultSellingPriceCents,
        })
        .from(products)
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(eq(products.organizationId, context.organization.id))
        .orderBy(asc(products.name)),
      this.getDashboard(context, { branchId: branch.id }),
    ]);

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
      suppliers: supplierRows.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
      })),
      products: productRows,
      recentEntries: dashboard.recentEntries,
    };
  }

  async getBranches(context: AuthContext, preferredBranchId?: string) {
    const [selectedBranch, branchOptions] = await Promise.all([
      resolveBranch(context, preferredBranchId),
      listOrganizationBranches(context.organization.id),
    ]);

    return {
      branch: {
        id: selectedBranch.id,
        name: selectedBranch.name,
      },
      branches: branchOptions.map((branchOption) => ({
        id: branchOption.id,
        name: branchOption.name,
        isPrimary: branchOption.isPrimary,
      })),
    };
  }

  async createBatch(context: AuthContext, input: CreateStockBatchInput) {
    const branch = await resolveBranch(context, input.branchId);
    const quantityReceived = input.quantityReceived;
    const unitCostCents = moneyToCents(input.unitCost);
    const unitSalePriceCents =
      typeof input.unitSalePrice === "number" ? moneyToCents(input.unitSalePrice) : null;

    return db.transaction(async (tx) => {
      let categoryId: string | null = null;

      if (input.categoryName) {
        const existingCategory = await findCategoryByName(tx, context.organization.id, input.categoryName);
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const [category] = await tx
            .insert(productCategories)
            .values({
              organizationId: context.organization.id,
              name: input.categoryName,
            })
            .returning();

          categoryId = category.id;
        }
      }

      let product = await findProductByName(tx, context.organization.id, input.productName);

      if (!product) {
        [product] = await tx
          .insert(products)
          .values({
            organizationId: context.organization.id,
            categoryId,
            name: input.productName,
            sku: buildSku(input.productName),
            defaultSellingPriceCents: unitSalePriceCents ?? unitCostCents,
          })
          .returning();
      } else if (
        categoryId ||
        (unitSalePriceCents !== null && unitSalePriceCents !== product.defaultSellingPriceCents)
      ) {
        [product] = await tx
          .update(products)
          .set({
            categoryId: categoryId ?? product.categoryId,
            defaultSellingPriceCents: unitSalePriceCents ?? product.defaultSellingPriceCents,
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id))
          .returning();
      }

      let supplierId: string | null = null;

      if (input.supplierName) {
        const existingSupplier = await findSupplierByName(tx, context.organization.id, input.supplierName);
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const [supplier] = await tx
            .insert(suppliers)
            .values({
              organizationId: context.organization.id,
              name: input.supplierName,
            })
            .returning();

          supplierId = supplier.id;
        }
      }

      const existingBatch = await tx.query.inventoryBatches.findFirst({
        where: and(
          eq(inventoryBatches.branchId, branch.id),
          eq(inventoryBatches.productId, product.id),
          sql`lower(${inventoryBatches.batchNumber}) = ${input.batchNumber.toLowerCase()}`,
        ),
      });

      if (existingBatch) {
        throw new Error("A batch with this number already exists for that product.");
      }

      const [batch] = await tx
        .insert(inventoryBatches)
        .values({
          organizationId: context.organization.id,
          branchId: branch.id,
          productId: product.id,
          supplierId,
          batchNumber: input.batchNumber,
          purchaseOrderNumber: input.purchaseOrderNumber,
          expiresAt: input.expiresAt,
          quantityReceived,
          quantityAvailable: quantityReceived,
          unitCostCents,
          unitSalePriceCents: unitSalePriceCents ?? product.defaultSellingPriceCents,
          notes: input.notes,
          status: "active",
        })
        .returning();

      await tx.insert(inventoryTransactions).values({
        organizationId: context.organization.id,
        branchId: branch.id,
        productId: product.id,
        batchId: batch.id,
        performedByUserId: context.user.id,
        transactionType: "receipt",
        quantityDelta: quantityReceived,
        unitCostCents,
        referenceType: "inventory_batch",
        referenceId: batch.id,
        note: input.notes ?? "Initial batch receipt",
      });

      return {
        id: batch.id,
        batchNumber: batch.batchNumber,
        productName: product.name,
      };
    });
  }

  async getBatchById(
    context: AuthContext,
    batchId: string,
  ): Promise<{
    id: string;
    batchNumber: string;
    purchaseOrderNumber: string | null;
    productName: string;
    sku: string;
    categoryName: string;
    supplierName: string | null;
    branchId: string;
    branchName: string;
    receivedAt: string;
    manufacturedAt: string | null;
    expiresAt: string;
    quantityReceived: number;
    quantityAvailable: number;
    unitCostCents: number;
    unitSalePriceCents: number | null;
    status: string;
    notes: string | null;
    daysToExpiry: number;
    stockProgressPercent: number;
    canDispose: boolean;
    transactions: Array<{
      id: string;
      occurredAt: string;
      transactionType: string;
      quantityDelta: number;
      performedByName: string | null;
      referenceType: string | null;
      referenceId: string | null;
      note: string | null;
    }>;
  } | null> {
    const today = startOfTodayUtc();
    const row = await db
      .select({
        id: inventoryBatches.id,
        batchNumber: inventoryBatches.batchNumber,
        purchaseOrderNumber: inventoryBatches.purchaseOrderNumber,
        receivedAt: inventoryBatches.receivedAt,
        manufacturedAt: inventoryBatches.manufacturedAt,
        expiresAt: inventoryBatches.expiresAt,
        quantityReceived: inventoryBatches.quantityReceived,
        quantityAvailable: inventoryBatches.quantityAvailable,
        unitCostCents: inventoryBatches.unitCostCents,
        unitSalePriceCents: inventoryBatches.unitSalePriceCents,
        status: inventoryBatches.status,
        notes: inventoryBatches.notes,
        productName: products.name,
        sku: products.sku,
        categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
        supplierName: suppliers.name,
        branchId: branches.id,
        branchName: branches.name,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .innerJoin(branches, eq(inventoryBatches.branchId, branches.id))
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id))
      .where(
        and(
          eq(inventoryBatches.id, batchId),
          eq(inventoryBatches.organizationId, context.organization.id),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (!row) {
      return null;
    }

    const expiryDate = normalizeDate(row.expiresAt);
    const daysToExpiry = differenceInDays(expiryDate, today);
    const isDisposed = row.status === "disposed";
    const canDispose = !isDisposed && row.quantityAvailable > 0;
    const stockProgressPercent =
      row.quantityReceived > 0
        ? Math.max(0, Math.min(100, Math.round((row.quantityAvailable / row.quantityReceived) * 100)))
        : 0;

    const txRows = await db
      .select({
        id: inventoryTransactions.id,
        occurredAt: inventoryTransactions.occurredAt,
        transactionType: inventoryTransactions.transactionType,
        quantityDelta: inventoryTransactions.quantityDelta,
        referenceType: inventoryTransactions.referenceType,
        referenceId: inventoryTransactions.referenceId,
        note: inventoryTransactions.note,
        performedByName: users.fullName,
      })
      .from(inventoryTransactions)
      .leftJoin(users, eq(inventoryTransactions.performedByUserId, users.id))
      .where(
        and(
          eq(inventoryTransactions.batchId, row.id),
          eq(inventoryTransactions.organizationId, context.organization.id),
        ),
      )
      .orderBy(desc(inventoryTransactions.occurredAt))
      .limit(50);

    const transactions = txRows.map((tx) => ({
      id: tx.id,
      occurredAt: new Date(tx.occurredAt).toISOString(),
      transactionType: tx.transactionType,
      quantityDelta: tx.quantityDelta,
      performedByName: tx.performedByName ?? null,
      referenceType: tx.referenceType ?? null,
      referenceId: tx.referenceId ?? null,
      note: tx.note ?? null,
    }));

    return {
      id: row.id,
      batchNumber: row.batchNumber,
      purchaseOrderNumber: row.purchaseOrderNumber,
      productName: row.productName,
      sku: row.sku,
      categoryName: row.categoryName,
      supplierName: row.supplierName,
      branchId: row.branchId,
      branchName: row.branchName,
      receivedAt: new Date(row.receivedAt).toISOString(),
      manufacturedAt: row.manufacturedAt ? toDateStringUtc(normalizeDate(row.manufacturedAt)) : null,
      expiresAt: expiryDate.toISOString(),
      quantityReceived: row.quantityReceived,
      quantityAvailable: row.quantityAvailable,
      unitCostCents: row.unitCostCents,
      unitSalePriceCents: row.unitSalePriceCents,
      status: row.status,
      notes: row.notes,
      daysToExpiry,
      stockProgressPercent,
      canDispose,
      transactions,
    };
  }

  async disposeBatch(context: AuthContext, batchId: string, note?: string, branchId?: string) {
    const branch = await resolveBranch(context, branchId);

    const batch = await db
      .select({
        id: inventoryBatches.id,
        batchNumber: inventoryBatches.batchNumber,
        quantityAvailable: inventoryBatches.quantityAvailable,
        notes: inventoryBatches.notes,
        productId: inventoryBatches.productId,
        productName: products.name,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .where(
        and(
          eq(inventoryBatches.id, batchId),
          eq(inventoryBatches.organizationId, context.organization.id),
          eq(inventoryBatches.branchId, branch.id),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (!batch) {
      throw new Error("Batch not found.");
    }

    await db.transaction(async (tx) => {
      if (batch.quantityAvailable > 0) {
        await tx.insert(inventoryTransactions).values({
          organizationId: context.organization.id,
          branchId: branch.id,
          productId: batch.productId,
          batchId: batch.id,
          performedByUserId: context.user.id,
          transactionType: "disposal",
          quantityDelta: -batch.quantityAvailable,
          referenceType: "inventory_batch",
          referenceId: batch.id,
          note: note ?? "Batch disposed from stock",
        });
      }

      await tx
        .update(inventoryBatches)
        .set({
          quantityAvailable: 0,
          status: "disposed",
          notes: appendNote(batch.notes, note),
          updatedAt: new Date(),
        })
        .where(eq(inventoryBatches.id, batch.id));
    });

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.productName,
    };
  }

  async restoreDisposedBatch(context: AuthContext, batchId: string, note?: string, branchId?: string) {
    const branch = await resolveBranch(context, branchId);
    const today = startOfTodayUtc();

    const batch = await db
      .select({
        id: inventoryBatches.id,
        batchNumber: inventoryBatches.batchNumber,
        quantityAvailable: inventoryBatches.quantityAvailable,
        quantityReceived: inventoryBatches.quantityReceived,
        notes: inventoryBatches.notes,
        productId: inventoryBatches.productId,
        productName: products.name,
        status: inventoryBatches.status,
        expiresAt: inventoryBatches.expiresAt,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .where(
        and(
          eq(inventoryBatches.id, batchId),
          eq(inventoryBatches.organizationId, context.organization.id),
          eq(inventoryBatches.branchId, branch.id),
        ),
      )
      .then((rows) => rows[0] ?? null);

    if (!batch) {
      throw new Error("Batch not found.");
    }

    if (batch.status !== "disposed") {
      throw new Error("Only disposed batches can be restored.");
    }

    const latestDisposalTx = await db.query.inventoryTransactions.findFirst({
      where: and(
        eq(inventoryTransactions.organizationId, context.organization.id),
        eq(inventoryTransactions.branchId, branch.id),
        eq(inventoryTransactions.batchId, batch.id),
        eq(inventoryTransactions.transactionType, "disposal"),
      ),
      orderBy: (table, { desc: orderDesc }) => [orderDesc(table.occurredAt)],
    });

    if (!latestDisposalTx) {
      throw new Error("Unable to restore batch because disposal history is missing.");
    }

    const restoreQuantity = Math.min(
      Math.abs(latestDisposalTx.quantityDelta),
      Math.max(0, batch.quantityReceived),
    );

    if (restoreQuantity <= 0) {
      throw new Error("No quantity available to restore for this batch.");
    }

    const expiresAtDate = normalizeDate(batch.expiresAt);
    const nextStatus = differenceInDays(expiresAtDate, today) < 0 ? "expired" : "active";

    await db.transaction(async (tx) => {
      await tx.insert(inventoryTransactions).values({
        organizationId: context.organization.id,
        branchId: branch.id,
        productId: batch.productId,
        batchId: batch.id,
        performedByUserId: context.user.id,
        transactionType: "adjustment",
        quantityDelta: restoreQuantity,
        referenceType: "inventory_batch",
        referenceId: batch.id,
        note: note ?? "Disposed batch restored from stock dashboard",
      });

      await tx
        .update(inventoryBatches)
        .set({
          quantityAvailable: restoreQuantity,
          status: nextStatus,
          notes: appendNote(batch.notes, note),
          updatedAt: new Date(),
        })
        .where(eq(inventoryBatches.id, batch.id));
    });

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productName: batch.productName,
      restoredQuantity: restoreQuantity,
    };
  }

  async adjustBatches(context: AuthContext, input: StockAdjustmentInput) {
    const branch = await resolveBranch(context, input.branchId);
    const today = startOfTodayUtc();

    const batches = await db
      .select({
        id: inventoryBatches.id,
        batchNumber: inventoryBatches.batchNumber,
        productId: inventoryBatches.productId,
        productName: products.name,
        quantityAvailable: inventoryBatches.quantityAvailable,
        expiresAt: inventoryBatches.expiresAt,
        status: inventoryBatches.status,
        notes: inventoryBatches.notes,
      })
      .from(inventoryBatches)
      .innerJoin(products, eq(inventoryBatches.productId, products.id))
      .where(
        and(
          eq(inventoryBatches.organizationId, context.organization.id),
          eq(inventoryBatches.branchId, branch.id),
          inArray(inventoryBatches.id, input.batchIds),
        ),
      );

    if (batches.length !== input.batchIds.length) {
      throw new Error("One or more selected batches could not be found.");
    }

    if (batches.some((batch) => batch.status === "disposed")) {
      throw new Error("Disposed batches cannot be adjusted.");
    }

    const updatedBatches: Array<{
      id: string;
      quantityAvailable: number;
      status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    }> = [];

    await db.transaction(async (tx) => {
      for (const batch of batches) {
        const nextQuantity = Math.max(0, batch.quantityAvailable + input.quantityDelta);
        const nextStatus = deriveBatchStatus(batch.status, batch.expiresAt, nextQuantity, today);
        const nextDaysToExpiry = differenceInDays(normalizeDate(batch.expiresAt), today);
        const nextUiStatus: "active" | "expiring_soon" | "expired" | "disposed" | "depleted" =
          nextStatus === "disposed"
            ? "disposed"
            : nextStatus === "depleted"
              ? "depleted"
              : nextStatus === "expired"
                ? "expired"
                : nextQuantity > 0 && nextDaysToExpiry <= 30
                  ? "expiring_soon"
                  : "active";

        await tx.insert(inventoryTransactions).values({
          organizationId: context.organization.id,
          branchId: branch.id,
          productId: batch.productId,
          batchId: batch.id,
          performedByUserId: context.user.id,
          transactionType: "adjustment",
          quantityDelta: input.quantityDelta,
          referenceType: "inventory_batch",
          referenceId: batch.id,
          note: input.note ?? "Inventory adjustment recorded from stock workspace",
        });

        await tx
          .update(inventoryBatches)
          .set({
            quantityAvailable: nextQuantity,
            status: nextStatus,
            notes: appendNote(batch.notes, input.note),
            updatedAt: new Date(),
          })
          .where(eq(inventoryBatches.id, batch.id));

        updatedBatches.push({
          id: batch.id,
          quantityAvailable: nextQuantity,
          status: nextUiStatus,
        });
      }
    });

    return {
      adjustedCount: batches.length,
      batchIds: batches.map((batch) => batch.id),
      productNames: batches.map((batch) => batch.productName),
      updatedBatches,
    };
  }
}

export const stockRepository: StockRepository = new StockRepositoryImpl();
