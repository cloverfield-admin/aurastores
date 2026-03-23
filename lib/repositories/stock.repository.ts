import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  inventoryBatches,
  inventoryTransactions,
  productCategories,
  products,
  suppliers,
} from "@/lib/db/schema";
import { slugify } from "@/lib/utils/slug";
import type { CreateStockBatchInput, StockAdjustmentInput } from "@/lib/validation/stock";
import type { AuthContext } from "./auth.repository";

type StockBranchContext = {
  id: string;
  name: string;
};

type StockBranchOption = StockBranchContext & {
  isPrimary: boolean;
};

export type StockDashboardData = {
  branch: StockBranchContext;
  branches: StockBranchOption[];
  lastSyncedAt: string;
  filters: {
    search: string;
    view: "all" | "expiring";
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  metrics: {
    totalStockValueCents: number;
    totalAvailableUnits: number;
    totalBatchCount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
    outOfStockSkuCount: number;
    lowStockSkuCount: number;
    reorderSuggestedCount: number;
    stockTurnoverRate: number;
    healthyBatchRatio: number;
    unitsSoldLast30Days: number;
  };
  inventory: Array<{
    id: string;
    productName: string;
    sku: string;
    categoryName: string;
    supplierName: string | null;
    batchNumber: string;
    expiresAt: string;
    daysToExpiry: number;
    quantityAvailable: number;
    quantityReceived: number;
    stockProgressPercent: number;
    unitCostCents: number;
    unitSalePriceCents: number | null;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    canDispose: boolean;
  }>;
  recentEntries: Array<{
    id: string;
    productName: string;
    batchNumber: string;
    quantityReceived: number;
    createdAt: string;
  }>;
  draftOrder: {
    branchName: string;
    productCount: number;
    products: string[];
  };
};

export type StockCatalogData = {
  branch: StockBranchContext;
  branches: StockBranchOption[];
  suppliers: Array<{
    id: string;
    name: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    defaultSellingPriceCents: number;
  }>;
  recentEntries: StockDashboardData["recentEntries"];
};

type ResolvedBranch = typeof branches.$inferSelect;
type QueryableDb = Pick<typeof db, "query">;
type StockView = "all" | "expiring";

type GetDashboardOptions = {
  branchId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  view?: StockView;
};

type GetCatalogOptions = {
  branchId?: string;
};

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

export class StockRepository {
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

    const [batchRows, productStockRows, salesActivity] = await Promise.all([
      db
        .select({
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
        })
        .from(inventoryBatches)
        .innerJoin(products, eq(inventoryBatches.productId, products.id))
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id))
        .where(
          and(
            eq(inventoryBatches.organizationId, context.organization.id),
            eq(inventoryBatches.branchId, branch.id),
          ),
        )
        .orderBy(asc(inventoryBatches.expiresAt), desc(inventoryBatches.createdAt)),
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

    const inventory = batchRows.map((row): StockDashboardData["inventory"][number] => {
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
    });

    const searchedInventory = search
      ? inventory.filter((row) => {
          const needle = search.toLowerCase();
          return [
            row.productName,
            row.sku,
            row.categoryName,
            row.batchNumber,
            row.supplierName ?? "",
          ].some((value) => value.toLowerCase().includes(needle));
        })
      : inventory;

    const filteredInventory =
      view === "expiring"
        ? searchedInventory.filter(
            (row) => row.status === "expiring_soon" || row.status === "expired",
          )
        : searchedInventory;

    const totalItems = filteredInventory.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const pageStart = (normalizedPage - 1) * pageSize;
    const pagedInventory = filteredInventory.slice(pageStart, pageStart + pageSize);

    const totalStockValueCents = inventory.reduce(
      (sum, row) => sum + row.quantityAvailable * row.unitCostCents,
      0,
    );
    const totalAvailableUnits = inventory.reduce((sum, row) => sum + row.quantityAvailable, 0);
    const nearExpiryBatchCount = inventory.filter((row) => row.status === "expiring_soon").length;
    const expiredBatchCount = inventory.filter((row) => row.status === "expired").length;

    const outOfStockProducts = productStockRows.filter((row) => row.totalAvailable <= 0);
    const lowStockProducts = productStockRows.filter(
      (row) => row.reorderLevel > 0 && row.totalAvailable > 0 && row.totalAvailable <= row.reorderLevel,
    );
    const reorderCandidates = productStockRows.filter(
      (row) => row.totalAvailable <= Math.max(row.reorderLevel, 1),
    );

    const healthyBatchRatio =
      inventory.length > 0
        ? Math.round(
            (inventory.filter((row) => row.status === "active").length / inventory.length) * 100,
          )
        : 0;
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
        totalBatchCount: inventory.length,
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
      recentEntries: [...batchRows]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, 3)
        .map((row) => ({
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

    await db.transaction(async (tx) => {
      for (const batch of batches) {
        const nextQuantity = Math.max(0, batch.quantityAvailable + input.quantityDelta);
        const nextStatus = deriveBatchStatus(batch.status, batch.expiresAt, nextQuantity, today);

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
      }
    });

    return {
      adjustedCount: batches.length,
      batchIds: batches.map((batch) => batch.id),
      productNames: batches.map((batch) => batch.productName),
    };
  }
}

export const stockRepository = new StockRepository();
