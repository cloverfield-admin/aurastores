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
import type {
  CreateStockBatchInput,
  CreateStockBatchesInput,
  StockAdjustmentInput,
} from "@/lib/validation/stock";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { filterBranchesForContext } from "@/lib/rbac/branch-access";
import type {
  StockCatalogData,
  StockCreateBatchResult,
  StockCreateBatchesResult,
  StockDashboardData,
  StockGetCatalogOptions,
  StockGetDashboardOptions,
  StockRepository,
} from "@/lib/repositories/stock/stock.repository";

type ResolvedBranch = typeof branches.$inferSelect;
type QueryableDb = Pick<typeof db, "query">;
type WritableDb = QueryableDb & Pick<typeof db, "select" | "insert" | "update">;

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

function normalizeLookupValue(value?: string | null) {
  return value?.trim() || undefined;
}

function reportCreateBatchTimings(metrics: {
  branchMs: number;
  lookupMs: number;
  writeMs: number;
  totalMs: number;
  createdProduct: boolean;
  createdSupplier: boolean;
  createdCategory: boolean;
}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[stock.createBatch]", metrics);
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
    unitOrderPriceCents: number;
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
    unitOrderPriceCents: row.unitOrderPriceCents,
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

async function loadBranchesForOrg(queryable: QueryableDb, organizationId: string) {
  return queryable.query.branches.findMany({
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function branchesVisibleInContext(queryable: QueryableDb, context: AuthContext) {
  const all = await loadBranchesForOrg(queryable, context.organization.id);
  return filterBranchesForContext(context, all);
}

function pickResolvedBranch(
  context: AuthContext,
  preferredBranchId: string | undefined,
  availableBranches: ResolvedBranch[],
): ResolvedBranch {
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

async function resolveBranch(
  queryable: QueryableDb,
  context: AuthContext,
  preferredBranchId?: string,
): Promise<ResolvedBranch> {
  const visible = await branchesVisibleInContext(queryable, context);
  if (!visible.length) {
    throw new Error("No branch access assigned for your account.");
  }
  return pickResolvedBranch(context, preferredBranchId, visible);
}

async function fetchRecentEntriesForBranch(
  organizationId: string,
  branchId: string,
): Promise<
  Array<{
    id: string;
    productName: string;
    batchNumber: string;
    quantityReceived: number;
    createdAt: Date;
  }>
> {
  return db
    .select({
      id: inventoryBatches.id,
      productName: products.name,
      batchNumber: inventoryBatches.batchNumber,
      quantityReceived: inventoryBatches.quantityReceived,
      createdAt: inventoryBatches.createdAt,
    })
    .from(inventoryBatches)
    .innerJoin(products, eq(inventoryBatches.productId, products.id))
    .where(
      and(eq(inventoryBatches.organizationId, organizationId), eq(inventoryBatches.branchId, branchId)),
    )
    .orderBy(desc(inventoryBatches.createdAt))
    .limit(3);
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

type BulkCreateBatchRow = {
  input: CreateStockBatchInput;
  productName: string;
  productNameLower: string;
  categoryName?: string;
  categoryLower?: string;
  supplierName?: string;
  supplierLower?: string;
  batchNumber: string;
  batchLower: string;
  barcodeNorm?: string;
  quantityReceived: number;
  unitOrderPriceCents: number;
  unitSalePriceCents: number;
};

type BulkProductRecord = {
  id: string;
  name: string;
  barcode: string | null;
  categoryId: string | null;
  defaultSellingPriceCents: number;
};

type BulkLookupState = {
  categoryByLower: Map<string, string>;
  supplierByLower: Map<string, string>;
  productByLower: Map<string, BulkProductRecord>;
  barcodeOwnerByCode: Map<string, { id: string; name: string }>;
};

type BulkBatchResultState =
  | { status: "pending" }
  | { status: "failed"; error: string }
  | { status: "success"; data: StockCreateBatchResult };

type ProductUpdatePlan = {
  id: string;
  categoryId: string | null;
  defaultSellingPriceCents: number;
  barcode: string | null;
};

const BULK_BRANCH_CONFLICT_ERROR = "Bulk batch creation can only target one branch per request.";
const BULK_DUPLICATE_ROW_ERROR = "Duplicate row: same product name and batch number.";
const BULK_BARCODE_UPLOAD_CONFLICT_ERROR = "This barcode is assigned to multiple products in this upload.";
const BULK_BATCH_EXISTS_ERROR = "A batch with this number already exists for that product.";
const BULK_BARCODE_MISMATCH_ERROR = "This medication already has a different barcode on file.";
const BULK_RETRY_ERROR = "Bulk upload changed during save. Please retry.";

function normalizeCreateBatchRows(inputs: CreateStockBatchesInput): BulkCreateBatchRow[] {
  return inputs.map((input) => {
    const productName = input.productName.trim();
    const categoryName = normalizeLookupValue(input.categoryName);
    const supplierName = normalizeLookupValue(input.supplierName);
    const batchNumber = input.batchNumber.trim();
    const barcodeNorm = normalizeLookupValue(input.productBarcode);

    return {
      input,
      productName,
      productNameLower: productName.toLowerCase(),
      categoryName,
      categoryLower: categoryName?.toLowerCase(),
      supplierName,
      supplierLower: supplierName?.toLowerCase(),
      batchNumber,
      batchLower: batchNumber.toLowerCase(),
      barcodeNorm,
      quantityReceived: input.quantityReceived,
      unitOrderPriceCents: moneyToCents(input.unitOrderPrice),
      unitSalePriceCents: moneyToCents(input.unitSellingPrice),
    };
  });
}

function createBulkBatchResultStates(length: number): BulkBatchResultState[] {
  return Array.from({ length }, () => ({ status: "pending" as const }));
}

function getPendingBulkBatchIndexes(results: BulkBatchResultState[]) {
  return results
    .map((result, index) => (result.status === "pending" ? index : -1))
    .filter((index) => index >= 0);
}

function failBulkBatchResult(results: BulkBatchResultState[], index: number, error: string) {
  results[index] = { status: "failed", error };
}

function succeedBulkBatchResult(
  results: BulkBatchResultState[],
  index: number,
  data: StockCreateBatchResult,
) {
  results[index] = { status: "success", data };
}

function finalizeBulkBatchResults(results: BulkBatchResultState[]): StockCreateBatchesResult[] {
  return results.map((result) => {
    if (result.status === "success") {
      return { ok: true, data: result.data };
    }

    return { ok: false, error: result.status === "failed" ? result.error : "Not processed." };
  });
}

function markInPayloadConflicts(rows: BulkCreateBatchRow[], results: BulkBatchResultState[]) {
  const seenPairs = new Set<string>();
  const barcodeOwners = new Map<string, { productNameLower: string; indexes: number[] }>();

  for (const index of getPendingBulkBatchIndexes(results)) {
    const row = rows[index];
    const pairKey = `${row.productNameLower}::${row.batchLower}`;
    if (seenPairs.has(pairKey)) {
      failBulkBatchResult(results, index, BULK_DUPLICATE_ROW_ERROR);
      continue;
    }

    seenPairs.add(pairKey);

    if (!row.barcodeNorm) {
      continue;
    }

    const owner = barcodeOwners.get(row.barcodeNorm);
    if (!owner) {
      barcodeOwners.set(row.barcodeNorm, {
        productNameLower: row.productNameLower,
        indexes: [index],
      });
      continue;
    }

    if (owner.productNameLower === row.productNameLower) {
      owner.indexes.push(index);
      continue;
    }

    for (const ownerIndex of owner.indexes) {
      if (results[ownerIndex].status === "pending") {
        failBulkBatchResult(results, ownerIndex, BULK_BARCODE_UPLOAD_CONFLICT_ERROR);
      }
    }
    failBulkBatchResult(results, index, BULK_BARCODE_UPLOAD_CONFLICT_ERROR);
  }
}

function getBulkBranchPreference(rows: BulkCreateBatchRow[]) {
  return rows.find((row) => row.input.branchId)?.input.branchId;
}

async function resolveBulkBatchBranch(
  tx: QueryableDb,
  context: AuthContext,
  rows: BulkCreateBatchRow[],
  results: BulkBatchResultState[],
) {
  const branch = await resolveBranch(tx, context, getBulkBranchPreference(rows));

  for (const index of getPendingBulkBatchIndexes(results)) {
    const requestedBranchId = rows[index].input.branchId;
    if (requestedBranchId && requestedBranchId !== branch.id) {
      failBulkBatchResult(results, index, BULK_BRANCH_CONFLICT_ERROR);
    }
  }

  return branch;
}

async function loadBulkBatchLookups(
  tx: WritableDb,
  organizationId: string,
  rows: BulkCreateBatchRow[],
  indexes: number[],
): Promise<BulkLookupState> {
  const categoryLower = Array.from(
    new Set(indexes.map((index) => rows[index].categoryLower).filter((value): value is string => Boolean(value))),
  );
  const supplierLower = Array.from(
    new Set(indexes.map((index) => rows[index].supplierLower).filter((value): value is string => Boolean(value))),
  );
  const productLower = Array.from(new Set(indexes.map((index) => rows[index].productNameLower)));
  const barcodeValues = Array.from(
    new Set(indexes.map((index) => rows[index].barcodeNorm).filter((value): value is string => Boolean(value))),
  );

  const [existingCategories, existingSuppliers, existingProducts, barcodeOwners] = await Promise.all([
    categoryLower.length === 0
      ? Promise.resolve([])
      : tx
          .select({ id: productCategories.id, name: productCategories.name })
          .from(productCategories)
          .where(
            and(
              eq(productCategories.organizationId, organizationId),
              inArray(sql`lower(${productCategories.name})`, categoryLower),
            ),
          ),
    supplierLower.length === 0
      ? Promise.resolve([])
      : tx
          .select({ id: suppliers.id, name: suppliers.name })
          .from(suppliers)
          .where(
            and(eq(suppliers.organizationId, organizationId), inArray(sql`lower(${suppliers.name})`, supplierLower)),
          ),
    productLower.length === 0
      ? Promise.resolve([])
      : tx
          .select({
            id: products.id,
            name: products.name,
            barcode: products.barcode,
            categoryId: products.categoryId,
            defaultSellingPriceCents: products.defaultSellingPriceCents,
          })
          .from(products)
          .where(and(eq(products.organizationId, organizationId), inArray(sql`lower(${products.name})`, productLower))),
    barcodeValues.length === 0
      ? Promise.resolve([])
      : tx
          .select({ id: products.id, name: products.name, barcode: products.barcode })
          .from(products)
          .where(and(eq(products.organizationId, organizationId), inArray(products.barcode, barcodeValues))),
  ]);

  return {
    categoryByLower: new Map(existingCategories.map((category) => [category.name.toLowerCase(), category.id])),
    supplierByLower: new Map(existingSuppliers.map((supplier) => [supplier.name.toLowerCase(), supplier.id])),
    productByLower: new Map(
      existingProducts.map((product) => [
        product.name.toLowerCase(),
        {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          categoryId: product.categoryId,
          defaultSellingPriceCents: product.defaultSellingPriceCents,
        },
      ]),
    ),
    barcodeOwnerByCode: new Map(
      barcodeOwners
        .filter((product) => product.barcode)
        .map((product) => [String(product.barcode), { id: product.id, name: product.name }]),
    ),
  };
}

function markPersistedBarcodeConflicts(
  rows: BulkCreateBatchRow[],
  lookups: BulkLookupState,
  indexes: number[],
  results: BulkBatchResultState[],
) {
  for (const index of indexes) {
    const row = rows[index];
    if (!row.barcodeNorm) {
      continue;
    }

    const owner = lookups.barcodeOwnerByCode.get(row.barcodeNorm);
    const product = lookups.productByLower.get(row.productNameLower);
    if (owner && (!product || owner.id !== product.id)) {
      failBulkBatchResult(results, index, `This barcode is already assigned to “${owner.name}”.`);
    }
  }
}

async function createMissingCategories(
  tx: WritableDb,
  organizationId: string,
  rows: BulkCreateBatchRow[],
  indexes: number[],
  lookups: BulkLookupState,
) {
  const missingCategoryNames = Array.from(
    new Set(
      indexes
        .map((index) => rows[index].categoryName)
        .filter((value): value is string => Boolean(value))
        .filter((name) => !lookups.categoryByLower.has(name.toLowerCase())),
    ),
  );

  if (missingCategoryNames.length === 0) {
    return;
  }

  const created = await tx
    .insert(productCategories)
    .values(missingCategoryNames.map((name) => ({ organizationId, name })))
    .returning({ id: productCategories.id, name: productCategories.name });

  for (const category of created) {
    lookups.categoryByLower.set(category.name.toLowerCase(), category.id);
  }
}

async function createMissingSuppliers(
  tx: WritableDb,
  organizationId: string,
  rows: BulkCreateBatchRow[],
  indexes: number[],
  lookups: BulkLookupState,
) {
  const missingSupplierNames = Array.from(
    new Set(
      indexes
        .map((index) => rows[index].supplierName)
        .filter((value): value is string => Boolean(value))
        .filter((name) => !lookups.supplierByLower.has(name.toLowerCase())),
    ),
  );

  if (missingSupplierNames.length === 0) {
    return;
  }

  const created = await tx
    .insert(suppliers)
    .values(missingSupplierNames.map((name) => ({ organizationId, name })))
    .returning({ id: suppliers.id, name: suppliers.name });

  for (const supplier of created) {
    lookups.supplierByLower.set(supplier.name.toLowerCase(), supplier.id);
  }
}

async function createMissingProducts(
  tx: WritableDb,
  organizationId: string,
  rows: BulkCreateBatchRow[],
  indexes: number[],
  lookups: BulkLookupState,
  results: BulkBatchResultState[],
) {
  const missingProductNames = Array.from(
    new Set(
      indexes
        .map((index) => rows[index].productName)
        .filter((name) => !lookups.productByLower.has(name.toLowerCase())),
    ),
  );

  if (missingProductNames.length === 0) {
    return;
  }

  const firstByLower = new Map<string, number>();
  for (const index of indexes) {
    if (!firstByLower.has(rows[index].productNameLower)) {
      firstByLower.set(rows[index].productNameLower, index);
    }
  }

  const created = await tx
    .insert(products)
    .values(
      missingProductNames.map((name) => {
        const row = rows[firstByLower.get(name.toLowerCase()) ?? indexes[0]];
        return {
          organizationId,
          categoryId: row.categoryLower ? lookups.categoryByLower.get(row.categoryLower) ?? null : null,
          name,
          sku: buildSku(name),
          barcode: row.barcodeNorm ?? null,
          defaultSellingPriceCents: row.unitSalePriceCents,
        };
      }),
    )
    .onConflictDoNothing({
      target: [products.organizationId, products.barcode],
    })
    .returning({
      id: products.id,
      name: products.name,
      barcode: products.barcode,
      categoryId: products.categoryId,
      defaultSellingPriceCents: products.defaultSellingPriceCents,
    });

  for (const product of created) {
    lookups.productByLower.set(product.name.toLowerCase(), product);
    if (product.barcode) {
      lookups.barcodeOwnerByCode.set(product.barcode, { id: product.id, name: product.name });
    }
  }

  const unresolvedProductLower = missingProductNames
    .map((name) => name.toLowerCase())
    .filter((nameLower) => !lookups.productByLower.has(nameLower));

  if (unresolvedProductLower.length === 0) {
    return;
  }

  const fetchedProducts = await tx
    .select({
      id: products.id,
      name: products.name,
      barcode: products.barcode,
      categoryId: products.categoryId,
      defaultSellingPriceCents: products.defaultSellingPriceCents,
    })
    .from(products)
    .where(and(eq(products.organizationId, organizationId), inArray(sql`lower(${products.name})`, unresolvedProductLower)));

  for (const product of fetchedProducts) {
    lookups.productByLower.set(product.name.toLowerCase(), product);
    if (product.barcode) {
      lookups.barcodeOwnerByCode.set(product.barcode, { id: product.id, name: product.name });
    }
  }

  for (const index of indexes) {
    const row = rows[index];
    if (lookups.productByLower.has(row.productNameLower)) {
      continue;
    }

    if (row.barcodeNorm) {
      const owner = lookups.barcodeOwnerByCode.get(row.barcodeNorm);
      if (owner) {
        failBulkBatchResult(results, index, `This barcode is already assigned to “${owner.name}”.`);
        continue;
      }
    }

    failBulkBatchResult(results, index, BULK_RETRY_ERROR);
  }
}

async function reconcileProducts(
  tx: WritableDb,
  organizationId: string,
  rows: BulkCreateBatchRow[],
  indexes: number[],
  lookups: BulkLookupState,
  results: BulkBatchResultState[],
) {
  await createMissingCategories(tx, organizationId, rows, indexes, lookups);
  await createMissingSuppliers(tx, organizationId, rows, indexes, lookups);
  await createMissingProducts(tx, organizationId, rows, indexes, lookups, results);

  const stagedProducts = new Map(
    Array.from(lookups.productByLower.entries()).map(([nameLower, product]) => [nameLower, { ...product }]),
  );

  for (const index of getPendingBulkBatchIndexes(results)) {
    const row = rows[index];
    const product = stagedProducts.get(row.productNameLower);
    if (!product) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      continue;
    }

    if (row.barcodeNorm && product.barcode && product.barcode !== row.barcodeNorm) {
      failBulkBatchResult(results, index, BULK_BARCODE_MISMATCH_ERROR);
      continue;
    }

    product.categoryId = row.categoryLower ? lookups.categoryByLower.get(row.categoryLower) ?? product.categoryId : product.categoryId;
    product.defaultSellingPriceCents = row.unitSalePriceCents ?? product.defaultSellingPriceCents;
    product.barcode = product.barcode ?? row.barcodeNorm ?? null;
  }

  const updates = new Map<string, ProductUpdatePlan>();
  for (const [nameLower, stagedProduct] of stagedProducts) {
    const currentProduct = lookups.productByLower.get(nameLower);
    if (!currentProduct) {
      continue;
    }

    if (
      stagedProduct.categoryId === currentProduct.categoryId &&
      stagedProduct.defaultSellingPriceCents === currentProduct.defaultSellingPriceCents &&
      stagedProduct.barcode === currentProduct.barcode
    ) {
      continue;
    }

    updates.set(stagedProduct.id, {
      id: stagedProduct.id,
      categoryId: stagedProduct.categoryId,
      defaultSellingPriceCents: stagedProduct.defaultSellingPriceCents,
      barcode: stagedProduct.barcode,
    });
  }

  for (const update of updates.values()) {
    const [product] = await tx
      .update(products)
      .set({
        categoryId: update.categoryId,
        defaultSellingPriceCents: update.defaultSellingPriceCents,
        barcode: update.barcode,
        updatedAt: new Date(),
      })
      .where(eq(products.id, update.id))
      .returning({
        id: products.id,
        name: products.name,
        barcode: products.barcode,
        categoryId: products.categoryId,
        defaultSellingPriceCents: products.defaultSellingPriceCents,
      });

    lookups.productByLower.set(product.name.toLowerCase(), product);
    if (product.barcode) {
      lookups.barcodeOwnerByCode.set(product.barcode, { id: product.id, name: product.name });
    }
  }
}

async function detectExistingBatchConflicts(
  tx: WritableDb,
  organizationId: string,
  branchId: string,
  rows: BulkCreateBatchRow[],
  lookups: BulkLookupState,
  indexes: number[],
  results: BulkBatchResultState[],
) {
  const desiredProductIds = indexes
    .map((index) => lookups.productByLower.get(rows[index].productNameLower)?.id)
    .filter((value): value is string => Boolean(value));
  const desiredBatchLower = Array.from(new Set(indexes.map((index) => rows[index].batchLower)));

  if (desiredProductIds.length === 0 || desiredBatchLower.length === 0) {
    return;
  }

  const existing = await tx
    .select({
      productId: inventoryBatches.productId,
      batchLower: sql`lower(${inventoryBatches.batchNumber})`.as("batchLower"),
    })
    .from(inventoryBatches)
    .where(
      and(
        eq(inventoryBatches.organizationId, organizationId),
        eq(inventoryBatches.branchId, branchId),
        inArray(inventoryBatches.productId, desiredProductIds),
        inArray(sql`lower(${inventoryBatches.batchNumber})`, desiredBatchLower),
      ),
    );

  const existingPairs = new Set(existing.map((batch) => `${batch.productId}::${String(batch.batchLower)}`));
  for (const index of indexes) {
    const product = lookups.productByLower.get(rows[index].productNameLower);
    if (!product) {
      continue;
    }

    if (existingPairs.has(`${product.id}::${rows[index].batchLower}`)) {
      failBulkBatchResult(results, index, BULK_BATCH_EXISTS_ERROR);
    }
  }
}

async function insertBatchesAndTransactions(
  tx: WritableDb,
  context: AuthContext,
  branchId: string,
  rows: BulkCreateBatchRow[],
  lookups: BulkLookupState,
  indexes: number[],
  results: BulkBatchResultState[],
) {
  const batchRows = indexes.map((index) => {
    const row = rows[index];
    const product = lookups.productByLower.get(row.productNameLower);
    if (!product) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      return null;
    }

    return {
      index,
      row,
      values: {
        organizationId: context.organization.id,
        branchId,
        productId: product.id,
        supplierId: row.supplierLower ? lookups.supplierByLower.get(row.supplierLower) ?? null : null,
        batchNumber: row.batchNumber,
        purchaseOrderNumber: row.input.purchaseOrderNumber,
        expiresAt: row.input.expiresAt,
        quantityReceived: row.quantityReceived,
        quantityAvailable: row.quantityReceived,
        unitOrderPriceCents: row.unitOrderPriceCents,
        unitSalePriceCents: row.unitSalePriceCents,
        notes: row.input.notes,
        status: "active" as const,
      },
    };
  });

  const readyBatchRows = batchRows.filter((row): row is NonNullable<typeof row> => Boolean(row));
  if (readyBatchRows.length === 0) {
    return;
  }

  const insertedBatches = await tx
    .insert(inventoryBatches)
    .values(readyBatchRows.map((row) => row.values))
    .onConflictDoNothing()
    .returning({
      id: inventoryBatches.id,
      batchNumber: inventoryBatches.batchNumber,
      productId: inventoryBatches.productId,
    });

  const batchIdByProductAndLower = new Map<string, { id: string; batchNumber: string }>();
  for (const batch of insertedBatches) {
    batchIdByProductAndLower.set(`${batch.productId}::${batch.batchNumber.toLowerCase()}`, {
      id: batch.id,
      batchNumber: batch.batchNumber,
    });
  }

  const insertedIndexes: number[] = [];
  for (const { index, row } of readyBatchRows) {
    const product = lookups.productByLower.get(row.productNameLower);
    if (!product) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      continue;
    }

    const batch = batchIdByProductAndLower.get(`${product.id}::${row.batchLower}`);
    if (!batch) {
      failBulkBatchResult(results, index, BULK_BATCH_EXISTS_ERROR);
      continue;
    }

    insertedIndexes.push(index);
  }

  if (insertedIndexes.length === 0) {
    return;
  }

  const transactionRows = insertedIndexes.flatMap((index) => {
    const row = rows[index];
    const product = lookups.productByLower.get(row.productNameLower);
    if (!product) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      return [];
    }

    const batch = batchIdByProductAndLower.get(`${product.id}::${row.batchLower}`);
    if (!batch) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      return [];
    }

    return [
      {
        organizationId: context.organization.id,
        branchId,
        productId: product.id,
        batchId: batch.id,
        performedByUserId: context.user.id,
        transactionType: "receipt" as const,
        quantityDelta: row.quantityReceived,
        unitOrderPriceCents: row.unitOrderPriceCents,
        referenceType: "inventory_batch" as const,
        referenceId: batch.id,
        note: row.input.notes ?? "Initial batch receipt",
      },
    ];
  });

  if (transactionRows.length > 0) {
    await tx.insert(inventoryTransactions).values(transactionRows);
  }

  for (const index of insertedIndexes) {
    const row = rows[index];
    const product = lookups.productByLower.get(row.productNameLower);
    const batch = product
      ? batchIdByProductAndLower.get(`${product.id}::${row.batchLower}`)
      : undefined;

    if (!product || !batch) {
      failBulkBatchResult(results, index, BULK_RETRY_ERROR);
      continue;
    }

    succeedBulkBatchResult(results, index, {
      id: batch.id,
      batchNumber: batch.batchNumber,
      productName: product.name,
    });
  }
}

function getUniqueViolationConstraint(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const constraint =
    "constraint" in error && typeof error.constraint === "string"
      ? error.constraint
      : "constraint_name" in error && typeof error.constraint_name === "string"
        ? error.constraint_name
        : undefined;

  const code = "code" in error && typeof error.code === "string" ? error.code : undefined;
  return code === "23505" ? constraint : undefined;
}

async function mapBulkUniqueViolationToResults(
  context: AuthContext,
  rows: BulkCreateBatchRow[],
  error: unknown,
): Promise<StockCreateBatchesResult[] | null> {
  const constraint = getUniqueViolationConstraint(error);
  if (!constraint) {
    return null;
  }

  if (constraint === "products_org_barcode_unique") {
    const barcodeValues = Array.from(
      new Set(rows.map((row) => row.barcodeNorm).filter((value): value is string => Boolean(value))),
    );
    if (barcodeValues.length === 0) {
      return rows.map(() => ({ ok: false, error: BULK_RETRY_ERROR }));
    }

    const owners = await db
      .select({ id: products.id, name: products.name, barcode: products.barcode })
      .from(products)
      .where(and(eq(products.organizationId, context.organization.id), inArray(products.barcode, barcodeValues)));

    const ownerByBarcode = new Map(
      owners
        .filter((product) => product.barcode)
        .map((product) => [String(product.barcode), { id: product.id, name: product.name.toLowerCase(), label: product.name }]),
    );

    return rows.map((row) => {
      const owner = row.barcodeNorm ? ownerByBarcode.get(row.barcodeNorm) : undefined;
      if (owner && owner.name !== row.productNameLower) {
        return { ok: false, error: `This barcode is already assigned to “${owner.label}”.` };
      }

      return { ok: false, error: BULK_RETRY_ERROR };
    });
  }

  if (
    constraint === "inventory_batches_branch_product_batch_unique" ||
    constraint === "inventory_batches_branch_product_lower_batch_idx"
  ) {
    const branch = await resolveBranch(db, context, getBulkBranchPreference(rows));
    const productLower = Array.from(new Set(rows.map((row) => row.productNameLower)));
    const productsByName = await db
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(and(eq(products.organizationId, context.organization.id), inArray(sql`lower(${products.name})`, productLower)));

    const productIdByLower = new Map(productsByName.map((product) => [product.name.toLowerCase(), product.id]));
    const desiredProductIds = Array.from(new Set(productIdByLower.values()));
    const desiredBatchLower = Array.from(new Set(rows.map((row) => row.batchLower)));

    const existing = desiredProductIds.length
      ? await db
          .select({
            productId: inventoryBatches.productId,
            batchLower: sql`lower(${inventoryBatches.batchNumber})`.as("batchLower"),
          })
          .from(inventoryBatches)
          .where(
            and(
              eq(inventoryBatches.organizationId, context.organization.id),
              eq(inventoryBatches.branchId, branch.id),
              inArray(inventoryBatches.productId, desiredProductIds),
              inArray(sql`lower(${inventoryBatches.batchNumber})`, desiredBatchLower),
            ),
          )
      : [];

    const existingPairs = new Set(existing.map((batch) => `${batch.productId}::${String(batch.batchLower)}`));
    return rows.map((row) => {
      const productId = productIdByLower.get(row.productNameLower);
      if (productId && existingPairs.has(`${productId}::${row.batchLower}`)) {
        return { ok: false, error: BULK_BATCH_EXISTS_ERROR };
      }

      return { ok: false, error: BULK_RETRY_ERROR };
    });
  }

  return null;
}

export class StockRepositoryImpl implements StockRepository {
  async getDashboard(
    context: AuthContext,
    options: GetDashboardOptions = {},
  ): Promise<StockDashboardData> {
    const branchOptions = await branchesVisibleInContext(db, context);
    const branch = pickResolvedBranch(context, options.branchId, branchOptions);
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

    const todaySql = sql.raw(`'${todayStr}'::date`);

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
      unitOrderPriceCents: inventoryBatches.unitOrderPriceCents,
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

    const listCountQuery = search
      ? db
          .select({ total: sql<number>`count(*)::int` })
          .from(inventoryBatches)
          .innerJoin(products, eq(inventoryBatches.productId, products.id))
          .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
          .leftJoin(suppliers, eq(inventoryBatches.supplierId, suppliers.id))
          .where(listWhere)
      : db
          .select({ total: sql<number>`count(*)::int` })
          .from(inventoryBatches)
          .where(and(branchBase, ...(viewFilter ? [viewFilter] : [])));

    const offsetGuess = (page - 1) * pageSize;
    const pagedQueryGuess = inventoryJoin()
      .where(listWhere)
      .orderBy(asc(inventoryBatches.expiresAt), desc(inventoryBatches.createdAt))
      .limit(pageSize)
      .offset(offsetGuess);

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
          and(
            eq(inventoryBatches.organizationId, context.organization.id),
            eq(inventoryBatches.branchId, branch.id),
          ),
        )
        .groupBy(inventoryBatches.productId),
    );

    const totalAvailableByProduct = sql<number>`coalesce(${branchStockSq.totalAvailable}, 0)::int`;
    const reorderThreshold = sql<number>`greatest(${products.reorderLevel}, 1)`;

    const productStockMetricsQuery = db
      .with(branchStockSq)
      .select({
        outOfStockSkuCount: sql<number>`count(*) filter (where ${totalAvailableByProduct} <= 0)::int`,
        lowStockSkuCount: sql<number>`count(*) filter (where ${products.reorderLevel} > 0 and ${totalAvailableByProduct} > 0 and ${totalAvailableByProduct} <= ${products.reorderLevel})::int`,
        reorderSuggestedCount: sql<number>`count(*) filter (where ${totalAvailableByProduct} <= ${reorderThreshold})::int`,
      })
      .from(products)
      .leftJoin(branchStockSq, eq(branchStockSq.productId, products.id))
      .where(eq(products.organizationId, context.organization.id));

    const draftOrderRowsQuery = db
      .with(branchStockSq)
      .select({
        productName: products.name,
      })
      .from(products)
      .leftJoin(branchStockSq, eq(branchStockSq.productId, products.id))
      .where(
        and(
          eq(products.organizationId, context.organization.id),
          sql`${totalAvailableByProduct} <= ${reorderThreshold}`,
        ),
      )
      .orderBy(asc(totalAvailableByProduct), desc(products.reorderLevel), asc(products.name))
      .limit(4);

    const [
      countRows,
      summaryRows,
      recentBatchRows,
      productStockMetricRows,
      draftOrderRows,
      salesActivity,
      pagedRowsFirst,
    ] = await Promise.all([
      listCountQuery,
      db
        .select({
          totalStockValueCents: sql`coalesce(sum(${inventoryBatches.quantityAvailable} * ${inventoryBatches.unitOrderPriceCents}), 0)::bigint`,
          totalAvailableUnits: sql<number>`coalesce(sum(${inventoryBatches.quantityAvailable}), 0)::int`,
          totalBatchCount: sql<number>`count(*)::int`,
          nearExpiryBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.status} <> 'disposed' and ${inventoryBatches.quantityAvailable} > 0 and ${inventoryBatches.expiresAt}::date >= ${todaySql} and ${inventoryBatches.expiresAt}::date <= (${todaySql} + interval '30 days'))::int`,
          expiredBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.status} <> 'disposed' and ${inventoryBatches.quantityAvailable} > 0 and ${inventoryBatches.expiresAt}::date < ${todaySql})::int`,
          activeBatchCount: sql<number>`count(*) filter (where ${inventoryBatches.status} <> 'disposed' and ${inventoryBatches.quantityAvailable} > 0 and ${inventoryBatches.expiresAt}::date > (${todaySql} + interval '30 days'))::int`,
        })
        .from(inventoryBatches)
        .where(branchBase),
      fetchRecentEntriesForBranch(context.organization.id, branch.id),
      productStockMetricsQuery,
      draftOrderRowsQuery,
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
      pagedQueryGuess,
    ]);

    const countRow = countRows[0];
    const summaryRow = summaryRows[0];
    const productStockMetricRow = productStockMetricRows[0];

    const totalItems = Number(countRow?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const normalizedPage = Math.min(page, totalPages);
    const offset = (normalizedPage - 1) * pageSize;

    let pagedRows = pagedRowsFirst;
    if (offset !== offsetGuess) {
      pagedRows = await inventoryJoin()
        .where(listWhere)
        .orderBy(asc(inventoryBatches.expiresAt), desc(inventoryBatches.createdAt))
        .limit(pageSize)
        .offset(offset);
    }

    const pagedInventory = pagedRows.map((row) => mapBatchRowToInventoryItem(row, today));

    const totalStockValueCents = Number(summaryRow?.totalStockValueCents ?? 0);
    const totalAvailableUnits = Number(summaryRow?.totalAvailableUnits ?? 0);
    const totalBatchCount = Number(summaryRow?.totalBatchCount ?? 0);
    const nearExpiryBatchCount = Number(summaryRow?.nearExpiryBatchCount ?? 0);
    const expiredBatchCount = Number(summaryRow?.expiredBatchCount ?? 0);
    const activeBatchCount = Number(summaryRow?.activeBatchCount ?? 0);
    const outOfStockSkuCount = Number(productStockMetricRow?.outOfStockSkuCount ?? 0);
    const lowStockSkuCount = Number(productStockMetricRow?.lowStockSkuCount ?? 0);
    const reorderSuggestedCount = Number(productStockMetricRow?.reorderSuggestedCount ?? 0);

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
        outOfStockSkuCount,
        lowStockSkuCount,
        reorderSuggestedCount,
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
        productCount: reorderSuggestedCount,
        products: draftOrderRows.map((row) => row.productName),
      },
    };
  }

  async getCatalog(
    context: AuthContext,
    options: GetCatalogOptions = {},
  ): Promise<StockCatalogData> {
    const includeProducts = options.includeProducts ?? true;
    const branchOptions = await branchesVisibleInContext(db, context);
    const branch = pickResolvedBranch(context, options.branchId, branchOptions);
    const productRowsPromise = includeProducts
      ? db
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
          .where(eq(products.organizationId, context.organization.id))
          .orderBy(asc(products.name))
      : Promise.resolve([]);

    const [supplierRows, productRows, recentBatchRows] = await Promise.all([
      db.query.suppliers.findMany({
        where: and(eq(suppliers.organizationId, context.organization.id), eq(suppliers.status, "active")),
        orderBy: (supplierTable, { asc: orderAsc }) => [orderAsc(supplierTable.name)],
      }),
      productRowsPromise,
      fetchRecentEntriesForBranch(context.organization.id, branch.id),
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
      recentEntries: recentBatchRows.map((row) => ({
        id: row.id,
        productName: row.productName,
        batchNumber: row.batchNumber,
        quantityReceived: row.quantityReceived,
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async suggestProducts(context: AuthContext, query: string, limit = 30): Promise<StockCatalogData["products"]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }
    const pattern = `%${trimmed}%`;
    const orgId = context.organization.id;
    return db
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
          eq(products.organizationId, orgId),
          or(
            eq(products.barcode, trimmed),
            ilike(products.name, pattern),
            ilike(products.sku, pattern),
          ),
        ),
      )
      .orderBy(asc(products.name))
      .limit(Math.min(Math.max(limit, 1), 50));
  }

  async getBranches(context: AuthContext, preferredBranchId?: string) {
    const branchOptions = await branchesVisibleInContext(db, context);
    const selectedBranch = pickResolvedBranch(context, preferredBranchId, branchOptions);

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
    const createStartedAt = performance.now();
    const productName = input.productName.trim();
    const categoryName = normalizeLookupValue(input.categoryName);
    const supplierName = normalizeLookupValue(input.supplierName);
    const batchNumber = input.batchNumber.trim();
    const quantityReceived = input.quantityReceived;
    const unitOrderPriceCents = moneyToCents(input.unitOrderPrice);
    const unitSalePriceCents = moneyToCents(input.unitSellingPrice);

    const barcodeNorm = normalizeLookupValue(input.productBarcode);

    return db.transaction(async (tx) => {
      const branchStartedAt = performance.now();
      const branch = await resolveBranch(tx, context, input.branchId);
      const branchMs = performance.now() - branchStartedAt;

      const lookupStartedAt = performance.now();
      const [existingCategory, existingSupplier, existingProduct, barcodeOwner] = await Promise.all([
        categoryName
          ? findCategoryByName(tx, context.organization.id, categoryName)
          : Promise.resolve(undefined),
        supplierName
          ? findSupplierByName(tx, context.organization.id, supplierName)
          : Promise.resolve(undefined),
        findProductByName(tx, context.organization.id, productName),
        barcodeNorm
          ? tx.query.products.findFirst({
              where: and(eq(products.organizationId, context.organization.id), eq(products.barcode, barcodeNorm)),
            })
          : Promise.resolve(undefined),
      ]);
      const lookupMs = performance.now() - lookupStartedAt;
      const writeStartedAt = performance.now();

      let categoryId = existingCategory?.id ?? null;
      let createdCategory = false;
      if (!categoryId && categoryName) {
        const [category] = await tx
          .insert(productCategories)
          .values({
            organizationId: context.organization.id,
            name: categoryName,
          })
          .returning();

        categoryId = category.id;
        createdCategory = true;
      }

      let product = existingProduct;
      let createdProduct = false;

      if (barcodeOwner && (!product || barcodeOwner.id !== product.id)) {
        throw new Error(`This barcode is already assigned to “${barcodeOwner.name}”.`);
      }

      if (!product) {
        [product] = await tx
          .insert(products)
          .values({
            organizationId: context.organization.id,
            categoryId,
            name: productName,
            sku: buildSku(productName),
            barcode: barcodeNorm ?? null,
            defaultSellingPriceCents: unitSalePriceCents,
          })
          .returning();
        createdProduct = true;
      } else if (barcodeNorm && product.barcode && product.barcode !== barcodeNorm) {
        throw new Error("This medication already has a different barcode on file.");
      } else {
        const nextCategoryId = categoryId ?? product.categoryId;
        const nextDefaultSellingPriceCents = unitSalePriceCents ?? product.defaultSellingPriceCents;
        const nextBarcode = product.barcode ?? barcodeNorm ?? null;

        if (
          nextCategoryId !== product.categoryId ||
          nextDefaultSellingPriceCents !== product.defaultSellingPriceCents ||
          nextBarcode !== product.barcode
        ) {
          [product] = await tx
            .update(products)
            .set({
              categoryId: nextCategoryId,
              defaultSellingPriceCents: nextDefaultSellingPriceCents,
              barcode: nextBarcode,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id))
            .returning();
        }
      }

      let supplierId = existingSupplier?.id ?? null;
      let createdSupplier = false;
      if (!supplierId && supplierName) {
        const [supplier] = await tx
          .insert(suppliers)
          .values({
            organizationId: context.organization.id,
            name: supplierName,
          })
          .returning();

        supplierId = supplier.id;
        createdSupplier = true;
      }

      const existingBatch = await tx.query.inventoryBatches.findFirst({
        where: and(
          eq(inventoryBatches.branchId, branch.id),
          eq(inventoryBatches.productId, product.id),
          sql`lower(${inventoryBatches.batchNumber}) = ${batchNumber.toLowerCase()}`,
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
          batchNumber,
          purchaseOrderNumber: input.purchaseOrderNumber,
          expiresAt: input.expiresAt,
          quantityReceived,
          quantityAvailable: quantityReceived,
          unitOrderPriceCents,
          unitSalePriceCents,
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
        unitOrderPriceCents,
        referenceType: "inventory_batch",
        referenceId: batch.id,
        note: input.notes ?? "Initial batch receipt",
      });

      const result = {
        id: batch.id,
        batchNumber: batch.batchNumber,
        productName: product.name,
      };

      reportCreateBatchTimings({
        branchMs: Number(branchMs.toFixed(1)),
        lookupMs: Number(lookupMs.toFixed(1)),
        writeMs: Number((performance.now() - writeStartedAt).toFixed(1)),
        totalMs: Number((performance.now() - createStartedAt).toFixed(1)),
        createdProduct,
        createdSupplier,
        createdCategory,
      });

      return result;
    });
  }

  async createBatches(context: AuthContext, inputs: CreateStockBatchesInput) {
    if (inputs.length === 0) {
      return [];
    }

    const normalized = normalizeCreateBatchRows(inputs);
    const results = createBulkBatchResultStates(normalized.length);
    markInPayloadConflicts(normalized, results);

    try {
      return await db.transaction(async (tx) => {
        const branch = await resolveBulkBatchBranch(tx, context, normalized, results);
        const initialIndexes = getPendingBulkBatchIndexes(results);
        if (initialIndexes.length === 0) {
          return finalizeBulkBatchResults(results);
        }

        const lookups = await loadBulkBatchLookups(tx, context.organization.id, normalized, initialIndexes);
        markPersistedBarcodeConflicts(normalized, lookups, initialIndexes, results);

        const reconciliationIndexes = getPendingBulkBatchIndexes(results);
        if (reconciliationIndexes.length === 0) {
          return finalizeBulkBatchResults(results);
        }

        await reconcileProducts(
          tx,
          context.organization.id,
          normalized,
          reconciliationIndexes,
          lookups,
          results,
        );

        const duplicateCheckIndexes = getPendingBulkBatchIndexes(results);
        if (duplicateCheckIndexes.length === 0) {
          return finalizeBulkBatchResults(results);
        }

        await detectExistingBatchConflicts(
          tx,
          context.organization.id,
          branch.id,
          normalized,
          lookups,
          duplicateCheckIndexes,
          results,
        );

        const insertIndexes = getPendingBulkBatchIndexes(results);
        if (insertIndexes.length === 0) {
          return finalizeBulkBatchResults(results);
        }

        await insertBatchesAndTransactions(
          tx,
          context,
          branch.id,
          normalized,
          lookups,
          insertIndexes,
          results,
        );

        return finalizeBulkBatchResults(results);
      });
    } catch (error) {
      const mapped = await mapBulkUniqueViolationToResults(context, normalized, error);
      if (mapped) {
        return mapped;
      }

      throw error;
    }
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
    unitOrderPriceCents: number;
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
        unitOrderPriceCents: inventoryBatches.unitOrderPriceCents,
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
      unitOrderPriceCents: row.unitOrderPriceCents,
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
    const branch = await resolveBranch(db, context, branchId);

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
    const branch = await resolveBranch(db, context, branchId);
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
    const branch = await resolveBranch(db, context, input.branchId);
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
      const now = new Date();
      const adjustments = batches.map((batch) => {
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

        return {
          batch,
          nextQuantity,
          nextStatus,
          nextUiStatus,
          nextNotes: appendNote(batch.notes, input.note),
        };
      });

      await tx.insert(inventoryTransactions).values(
        adjustments.map(({ batch }) => ({
          organizationId: context.organization.id,
          branchId: branch.id,
          productId: batch.productId,
          batchId: batch.id,
          performedByUserId: context.user.id,
          transactionType: "adjustment" as const,
          quantityDelta: input.quantityDelta,
          referenceType: "inventory_batch" as const,
          referenceId: batch.id,
          note: input.note ?? "Inventory adjustment recorded from stock workspace",
        })),
      );

      const quantityCase = sql<number>`case ${inventoryBatches.id} ${sql.join(
        adjustments.map(({ batch, nextQuantity }) => sql`when ${batch.id} then ${nextQuantity}`),
        sql.raw(" "),
      )} end`;
      const statusCase = sql<string>`case ${inventoryBatches.id} ${sql.join(
        adjustments.map(({ batch, nextStatus }) => sql`when ${batch.id} then ${nextStatus}`),
        sql.raw(" "),
      )} end`;
      const notesCase = sql<string | null>`case ${inventoryBatches.id} ${sql.join(
        adjustments.map(({ batch, nextNotes }) => sql`when ${batch.id} then ${nextNotes}`),
        sql.raw(" "),
      )} end`;

      await tx
        .update(inventoryBatches)
        .set({
          quantityAvailable: quantityCase,
          status: statusCase,
          notes: notesCase,
          updatedAt: now,
        })
        .where(
          and(
            eq(inventoryBatches.organizationId, context.organization.id),
            eq(inventoryBatches.branchId, branch.id),
            inArray(
              inventoryBatches.id,
              adjustments.map(({ batch }) => batch.id),
            ),
          ),
        );

      updatedBatches.push(
        ...adjustments.map(({ batch, nextQuantity, nextUiStatus }) => ({
          id: batch.id,
          quantityAvailable: nextQuantity,
          status: nextUiStatus,
        })),
      );
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
