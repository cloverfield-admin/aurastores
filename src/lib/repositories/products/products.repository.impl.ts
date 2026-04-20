import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories, products } from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { assertWithinLimit } from "@/lib/billing/entitlements";
import type {
  ProductDetail,
  ProductsRepository,
  ProductUpdateInput,
} from "@/lib/repositories/products/products.repository";

function moneyToCents(value: number) {
  return Math.round(value * 100);
}

async function resolveCategoryIdForUpdate(
  context: AuthContext,
  tx: typeof db,
  categoryName: string | null,
): Promise<string | null> {
  if (categoryName === null) {
    return null;
  }

  const existing = await tx.query.productCategories.findFirst({
    where: and(
      eq(productCategories.organizationId, context.organization.id),
      sql`lower(${productCategories.name}) = ${categoryName.toLowerCase()}`,
    ),
  });
  if (existing) {
    return existing.id;
  }

  const [{ value: activeCategoryCount }] = await tx
    .select({ value: count() })
    .from(productCategories)
    .where(
      and(
        eq(productCategories.organizationId, context.organization.id),
        isNull(productCategories.archivedAt),
      ),
    );

  assertWithinLimit({
    kind: "categories",
    current: activeCategoryCount,
    limit: context.entitlements.limits.categories,
  });

  const [created] = await tx
    .insert(productCategories)
    .values({ organizationId: context.organization.id, name: categoryName })
    .returning({ id: productCategories.id });

  return created?.id ?? null;
}

async function getBarcodeOwner(
  organizationId: string,
  barcode: string,
): Promise<{ id: string; name: string } | null> {
  const owner = await db.query.products.findFirst({
    where: and(eq(products.organizationId, organizationId), eq(products.barcode, barcode)),
    columns: { id: true, name: true },
  });
  return owner ? { id: owner.id, name: owner.name } : null;
}

export class ProductsRepositoryImpl implements ProductsRepository {
  async getById(context: AuthContext, productId: string): Promise<ProductDetail | null> {
    const row = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryId: products.categoryId,
        categoryName: sql<string>`coalesce(${productCategories.name}, 'Uncategorized')`,
        defaultSellingPriceCents: products.defaultSellingPriceCents,
        status: products.status,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.organizationId, context.organization.id), eq(products.id, productId)))
      .then((rows) => rows[0] ?? null);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      sku: row.sku,
      barcode: row.barcode ?? null,
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName,
      defaultSellingPriceCents: row.defaultSellingPriceCents,
      status: row.status,
    };
  }

  async update(context: AuthContext, productId: string, input: ProductUpdateInput): Promise<ProductDetail> {
    const existing = await this.getById(context, productId);
    if (!existing) {
      throw new Error("Product not found.");
    }

    const nextBarcode =
      input.barcode === undefined ? existing.barcode : input.barcode;

    if (nextBarcode && nextBarcode !== existing.barcode) {
      const owner = await getBarcodeOwner(context.organization.id, nextBarcode);
      if (owner && owner.id !== productId) {
        throw new Error(`This barcode is already assigned to “${owner.name}”.`);
      }
    }

    const nextDefaultSellingPriceCents =
      input.defaultSellingPrice === undefined
        ? existing.defaultSellingPriceCents
        : moneyToCents(input.defaultSellingPrice);

    const nextName = input.name === undefined ? existing.name : input.name;
    const nextStatus = input.status === undefined ? existing.status : input.status;

    const nextCategoryId =
      input.categoryName === undefined
        ? existing.categoryId
        : await db.transaction(async (tx) =>
            resolveCategoryIdForUpdate(context, tx, input.categoryName ?? null),
          );

    const [updated] = await db
      .update(products)
      .set({
        name: nextName,
        barcode: nextBarcode,
        categoryId: nextCategoryId,
        defaultSellingPriceCents: nextDefaultSellingPriceCents,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(products.organizationId, context.organization.id), eq(products.id, productId)))
      .returning({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        categoryId: products.categoryId,
        defaultSellingPriceCents: products.defaultSellingPriceCents,
        status: products.status,
      });

    if (!updated) {
      throw new Error("Product not found.");
    }

    const categoryName =
      updated.categoryId === null
        ? "Uncategorized"
        : (await db
            .select({ name: productCategories.name })
            .from(productCategories)
            .where(and(eq(productCategories.organizationId, context.organization.id), eq(productCategories.id, updated.categoryId)))
            .then((rows) => rows[0]?.name ?? "Uncategorized"));

    return {
      id: updated.id,
      name: updated.name,
      sku: updated.sku,
      barcode: updated.barcode ?? null,
      categoryId: updated.categoryId ?? null,
      categoryName,
      defaultSellingPriceCents: updated.defaultSellingPriceCents,
      status: updated.status,
    };
  }
}

export const productsRepository: ProductsRepository = new ProductsRepositoryImpl();

