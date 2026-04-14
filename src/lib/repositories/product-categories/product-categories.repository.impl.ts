import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { productCategories } from "@/lib/db/schema";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type {
  ProductCategoriesRepository,
  ProductCategory,
  ProductCategoryCreateInput,
  ProductCategoryUpdateInput,
  Pagination,
} from "@/lib/repositories/product-categories/product-categories.repository";

function toCategory(row: typeof productCategories.$inferSelect): ProductCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    archivedAt: row.archivedAt ? new Date(row.archivedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export class ProductCategoriesRepositoryImpl implements ProductCategoriesRepository {
  async list(
    context: AuthContext,
    options?: { includeArchived?: boolean; page?: number; pageSize?: number },
  ): Promise<{ categories: ProductCategory[]; pagination: Pagination }> {
    const includeArchived = options?.includeArchived ?? false;
    const page = Math.max(1, Math.floor(options?.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(options?.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const where = includeArchived
      ? and(eq(productCategories.organizationId, context.organization.id))
      : and(eq(productCategories.organizationId, context.organization.id), isNull(productCategories.archivedAt));

    const [{ value: totalItems }] = await db
      .select({ value: count() })
      .from(productCategories)
      .where(where);

    const rows = await db.query.productCategories.findMany({
      where,
      orderBy: (table, { asc: orderAsc }) => [orderAsc(table.name)],
      limit: pageSize,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);

    return {
      categories: rows.map(toCategory),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async create(context: AuthContext, input: ProductCategoryCreateInput): Promise<ProductCategory> {
    const name = input.name.trim();
    const description = input.description?.trim() ? input.description.trim() : null;

    try {
      const [created] = await db
        .insert(productCategories)
        .values({
          organizationId: context.organization.id,
          name,
          description,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      if (!created) {
        throw new Error("Could not create category.");
      }

      return toCategory(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create category.";
      if (/product_categories_org_lower_name_active_unique/i.test(message)) {
        throw new Error("A category with this name already exists.");
      }
      throw error;
    }
  }

  async update(
    context: AuthContext,
    categoryId: string,
    input: ProductCategoryUpdateInput,
  ): Promise<ProductCategory> {
    const name = input.name.trim();
    const description = input.description?.trim() ? input.description.trim() : null;

    try {
      const [updated] = await db
        .update(productCategories)
        .set({
          name,
          description,
          updatedAt: new Date(),
        })
        .where(and(eq(productCategories.id, categoryId), eq(productCategories.organizationId, context.organization.id)))
        .returning();

      if (!updated) {
        throw new Error("Category not found.");
      }

      return toCategory(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update category.";
      if (/product_categories_org_lower_name_active_unique/i.test(message)) {
        throw new Error("A category with this name already exists.");
      }
      throw error;
    }
  }

  async archive(context: AuthContext, categoryId: string): Promise<ProductCategory> {
    const [updated] = await db
      .update(productCategories)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(productCategories.id, categoryId), eq(productCategories.organizationId, context.organization.id)))
      .returning();

    if (!updated) {
      throw new Error("Category not found.");
    }

    return toCategory(updated);
  }

  async restore(context: AuthContext, categoryId: string): Promise<ProductCategory> {
    try {
      const [updated] = await db
        .update(productCategories)
        .set({
          archivedAt: null,
          updatedAt: new Date(),
        })
        .where(and(eq(productCategories.id, categoryId), eq(productCategories.organizationId, context.organization.id)))
        .returning();

      if (!updated) {
        throw new Error("Category not found.");
      }

      return toCategory(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to restore category.";
      if (/product_categories_org_lower_name_active_unique/i.test(message)) {
        throw new Error("A category with this name already exists.");
      }
      throw error;
    }
  }
}

export const productCategoriesRepository: ProductCategoriesRepository = new ProductCategoriesRepositoryImpl();

