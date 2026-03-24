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

async function listOrganizationBranches(organizationId: string) {
  return db.query.branches.findMany({
    where: eq(branches.organizationId, organizationId),
    orderBy: (branchTable, { desc: orderDesc, asc: orderAsc }) => [
      orderDesc(branchTable.isPrimary),
      orderAsc(branchTable.name),
    ],
  });
}

async function resolveBranch(context: AuthContext, preferredBranchId?: string) {
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
    throw new Error("Finish branch setup before using sales.");
  }

  return branch;
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
    const branch = await resolveBranch(context, branchId);
    const branchOptions = await listOrganizationBranches(context.organization.id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000);

    const [salesRows, topProductsRows, recentRows, branchRevenueRows, soldUnitsRows, soldItemRows] =
      await Promise.all([
      db
        .select({
          id: sales.id,
          totalCents: sales.totalCents,
          createdAt: sales.createdAt,
        })
        .from(sales)
        .where(
          and(
            eq(sales.organizationId, context.organization.id),
            eq(sales.branchId, branch.id),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${sixtyDaysAgo.toISOString()}`,
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
            sql`${inventoryTransactions.occurredAt} >= ${thirtyDaysAgo.toISOString()}`,
          ),
        ),
      db
        .select({
          createdAt: sales.createdAt,
          quantity: sql<number>`coalesce(sum(${saleItems.quantity}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(
          and(
            eq(sales.organizationId, context.organization.id),
            eq(sales.branchId, branch.id),
            eq(sales.status, "completed"),
            sql`${sales.createdAt} >= ${new Date(now.getTime() - 35 * 86_400_000).toISOString()}`,
          ),
        )
        .groupBy(sales.createdAt),
    ]);

    const totalRevenueCents = salesRows
      .filter((row) => row.createdAt >= thirtyDaysAgo)
      .reduce((sum, row) => sum + row.totalCents, 0);
    const previousRevenueCents = salesRows
      .filter((row) => row.createdAt >= sixtyDaysAgo && row.createdAt < thirtyDaysAgo)
      .reduce((sum, row) => sum + row.totalCents, 0);
    const totalSalesCount = salesRows.filter((row) => row.createdAt >= thirtyDaysAgo).length;
    const averageOrderValueCents = totalSalesCount > 0 ? Math.round(totalRevenueCents / totalSalesCount) : 0;
    const topTotal = topProductsRows.reduce((sum, row) => sum + row.amountCents, 0);
    const branchTotalRevenue = branchRevenueRows.reduce((sum, row) => sum + row.amountCents, 0);
    const trendWindowStart = new Date(now.getTime() - 35 * 86_400_000);
    const dateLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });
    const trend = Array.from({ length: 5 }, (_, index) => {
      const bucketStart = new Date(trendWindowStart.getTime() + index * 7 * 86_400_000);
      const bucketEnd = new Date(bucketStart.getTime() + 7 * 86_400_000);
      const revenueCents = salesRows
        .filter((row) => row.createdAt >= bucketStart && row.createdAt < bucketEnd)
        .reduce((sum, row) => sum + row.totalCents, 0);
      const unitsSold = soldItemRows
        .filter((row) => row.createdAt >= bucketStart && row.createdAt < bucketEnd)
        .reduce((sum, row) => sum + row.quantity, 0);

      return {
        label: dateLabelFormatter.format(bucketStart),
        revenueCents,
        unitsSold,
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
        totalRevenueCents,
        previousRevenueCents,
        totalSalesCount,
        averageOrderValueCents,
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
    const branch = await resolveBranch(context, branchId);
    const branchOptions = await listOrganizationBranches(context.organization.id);
    const limit = clampPageSize(100, 100);

    const [productRows, batchRows] = await Promise.all([
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
        .orderBy(asc(products.name))
        .limit(limit),
      db
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
          ),
        )
        .orderBy(asc(inventoryBatches.expiresAt)),
    ]);

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

      const productIds = input.items.map((item) => item.productId);
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
      const requestedBatchIds = input.items.map((item) => item.batchId).filter(Boolean) as string[];

      const batchRows = await tx
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
            requestedBatchIds.length > 0
              ? inArray(inventoryBatches.id, requestedBatchIds)
              : sql`true`,
          ),
        );

      const batchById = new Map(batchRows.map((row) => [row.id, row]));
      const openBatchesByProduct = await tx
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
          ),
        )
        .orderBy(asc(inventoryBatches.expiresAt));

      const openBatchMap = new Map<string, (typeof openBatchesByProduct)>();
      for (const row of openBatchesByProduct) {
        const list = openBatchMap.get(row.productId) ?? [];
        list.push(row);
        openBatchMap.set(row.productId, list);
      }

      const availableByBatch = new Map(
        openBatchesByProduct.map((row) => [row.id, row.quantityAvailable]),
      );

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

        const available = availableByBatch.get(batch.id) ?? batch.quantityAvailable;

        if (input.status === "completed" && available < item.quantity) {
          throw new Error(
            `Insufficient quantity for ${product.name} in batch ${batch.batchNumber}. Available: ${available}.`,
          );
        }

        const unitPriceCents = moneyToCents(item.unitPrice);
        const lineSubtotalCents = unitPriceCents * item.quantity;
        const taxRateBps = 1500;
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
        for (const item of preparedItems) {
          const nextQuantity = availableByBatch.get(item.batchId) ?? 0;
          const nextStatus = deriveBatchStatus(item.batchStatus, item.batchExpiresAt, nextQuantity, today);

          await tx
            .update(inventoryBatches)
            .set({
              quantityAvailable: nextQuantity,
              status: nextStatus,
              updatedAt: new Date(),
            })
            .where(eq(inventoryBatches.id, item.batchId));

          await tx.insert(inventoryTransactions).values({
            organizationId: context.organization.id,
            branchId: branch.id,
            productId: item.productId,
            batchId: item.batchId,
            performedByUserId: context.user.id,
            transactionType: "sale",
            quantityDelta: -item.quantity,
            unitCostCents: item.unitPriceCents,
            referenceType: "sale",
            referenceId: sale.id,
            note: `Sale ${sale.saleNumber}`,
          });
        }
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
