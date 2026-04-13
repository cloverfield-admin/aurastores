import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  branches,
  inventoryBatches,
  inventoryTransactions,
  patients,
  payments,
  productCategories,
  products,
  saleItems,
  sales,
} from "@/lib/db/schema";
import type { CreateSaleInput } from "@/lib/validation/sales";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { SalesCatalogData, SalesDashboardData, SalesRepository } from "@/lib/repositories/sales/sales.repository";

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

function differenceInDays(target: Date, base: Date) {
  return Math.ceil((target.getTime() - base.getTime()) / 86_400_000);
}

function moneyToCents(value: number) {
  return Math.round(value * 100);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
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
  const branchOptions = await listOrganizationBranches(context.organization.id);
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
  async getDashboard(context: AuthContext, branchId?: string): Promise<SalesDashboardData> {
    const { branch, branchOptions } = await resolveBranchContext(context, branchId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);
    const trendWindowStart = new Date(now.getTime() - 35 * 86_400_000);
    const nowIso = now.toISOString();
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();
    const sixtyDaysAgoIso = sixtyDaysAgo.toISOString();
    const trendWindowStartIso = trendWindowStart.toISOString();
    const trendWindowStartLiteral = sql.raw(`'${trendWindowStartIso}'::timestamptz`);
    const trendBucketExpr =
      sql<number>`floor(extract(epoch from (${sales.createdAt} - ${trendWindowStartLiteral})) / 604800)::int`;

    const [metricsRows, topProductsRows, recentRows, branchRevenueRows, soldUnitsRows, trendRevenueRows, trendUnitsRows] =
      await Promise.all([
        db
          .select({
            totalRevenueCents:
              sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz), 0)::int`,
            previousRevenueCents:
              sql<number>`coalesce(sum(${sales.totalCents}) filter (where ${sales.createdAt} >= ${sixtyDaysAgoIso}::timestamptz and ${sales.createdAt} < ${thirtyDaysAgoIso}::timestamptz), 0)::int`,
            totalSalesCount:
              sql<number>`coalesce(count(*) filter (where ${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz), 0)::int`,
            averageOrderValueCents:
              sql<number>`coalesce(round(avg(${sales.totalCents}) filter (where ${sales.createdAt} >= ${thirtyDaysAgoIso}::timestamptz)), 0)::int`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${sixtyDaysAgoIso}::timestamptz`,
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
            ),
          )
          .groupBy(products.id, products.name)
          .orderBy(desc(sql`coalesce(sum(${saleItems.lineTotalCents}), 0)`))
          .limit(4),
        db
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
          .limit(5),
        db
          .select({
            branchId: sales.branchId,
            branchName: branches.name,
            amountCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          })
          .from(sales)
          .innerJoin(branches, eq(sales.branchId, branches.id))
          .where(
            and(eq(sales.organizationId, context.organization.id), eq(sales.status, "completed")),
          )
          .groupBy(sales.branchId, branches.name),
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
              sql`${inventoryTransactions.occurredAt} >= ${thirtyDaysAgoIso}::timestamptz`,
            ),
          ),
        db
          .select({
            bucketIndex: trendBucketExpr,
            revenueCents: sql<number>`coalesce(sum(${sales.totalCents}), 0)::int`,
          })
          .from(sales)
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${trendWindowStartIso}::timestamptz`,
              sql`${sales.createdAt} < ${nowIso}::timestamptz`,
            ),
          )
          .groupBy(trendBucketExpr)
          .orderBy(asc(trendBucketExpr)),
        db
          .select({
            bucketIndex: trendBucketExpr,
            quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
          })
          .from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(
            and(
              eq(sales.organizationId, context.organization.id),
              eq(sales.branchId, branch.id),
              eq(sales.status, "completed"),
              sql`${sales.createdAt} >= ${trendWindowStartIso}::timestamptz`,
              sql`${sales.createdAt} < ${nowIso}::timestamptz`,
            ),
          )
          .groupBy(trendBucketExpr)
          .orderBy(asc(trendBucketExpr)),
      ]);

    const metrics = metricsRows[0] ?? {
      totalRevenueCents: 0,
      previousRevenueCents: 0,
      totalSalesCount: 0,
      averageOrderValueCents: 0,
    };
    const topTotal = topProductsRows.reduce((sum, row) => sum + row.amountCents, 0);
    const branchTotalRevenue = branchRevenueRows.reduce((sum, row) => sum + row.amountCents, 0);
    const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
    const trendRevenueMap = new Map(trendRevenueRows.map((row) => [row.bucketIndex, row.revenueCents]));
    const trendUnitsMap = new Map(trendUnitsRows.map((row) => [row.bucketIndex, row.quantity]));
    const trend = Array.from({ length: 5 }, (_, index) => {
      const bucketStart = new Date(trendWindowStart.getTime() + index * 7 * 86_400_000);

      return {
        label: dateLabelFormatter.format(bucketStart),
        revenueCents: trendRevenueMap.get(index) ?? 0,
        unitsSold: trendUnitsMap.get(index) ?? 0,
      };
    });

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
        totalSalesCount: metrics.totalSalesCount,
        averageOrderValueCents: metrics.averageOrderValueCents,
        unitsSoldLast30Days: soldUnitsRows[0]?.unitsSold ?? 0,
      },
      topProducts: topProductsRows.map((row) => ({
        productId: row.productId,
        name: row.productName,
        amountCents: row.amountCents,
        pct: topTotal > 0 ? Math.max(1, Math.round((row.amountCents / topTotal) * 100)) : 0,
      })),
      recentSales: recentRows.map((row) => ({
        id: row.id,
        saleNumber: row.saleNumber,
        patientName: row.patientName,
        createdAt: row.createdAt.toISOString(),
        totalCents: row.totalCents,
      })),
      branchDistribution: branchRevenueRows.map((row) => ({
        branchId: row.branchId,
        name: row.branchName,
        amountCents: row.amountCents,
        pct:
          branchTotalRevenue > 0 ? Math.max(1, Math.round((row.amountCents / branchTotalRevenue) * 100)) : 0,
      })),
      trend,
    };
  }

  async getCatalog(context: AuthContext, branchId?: string): Promise<SalesCatalogData> {
    const { branch, branchOptions } = await resolveBranchContext(context, branchId);
    const limit = clampPageSize(100, 100);

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
      .where(eq(products.organizationId, context.organization.id))
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
        const taxRateBps = 0;
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

      await tx.insert(payments).values({
        saleId: sale.id,
        organizationId: context.organization.id,
        branchId: branch.id,
        method:
          input.paymentMethod === "aura-pay"
            ? "aura_pay_wallet"
            : input.paymentMethod === "bank-transfer"
              ? "bank_transfer"
              : input.paymentMethod,
        status: input.status === "completed" ? "paid" : "pending",
        reference: input.paymentReference,
        amountCents: totalCents,
        currency: "ZMW",
        paidAt: input.status === "completed" ? new Date() : null,
      });

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
            unitCostCents: item.unitPriceCents,
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
