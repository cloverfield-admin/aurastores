import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductCategoryCreateInput = {
  name: string;
  description?: string | null;
};

export type ProductCategoryUpdateInput = {
  name: string;
  description?: string | null;
};

export type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export interface ProductCategoriesRepository {
  list(
    context: AuthContext,
    options?: { includeArchived?: boolean; page?: number; pageSize?: number },
  ): Promise<{ categories: ProductCategory[]; pagination: Pagination }>;

  create(context: AuthContext, input: ProductCategoryCreateInput): Promise<ProductCategory>;

  update(
    context: AuthContext,
    categoryId: string,
    input: ProductCategoryUpdateInput,
  ): Promise<ProductCategory>;

  archive(context: AuthContext, categoryId: string): Promise<ProductCategory>;
  restore(context: AuthContext, categoryId: string): Promise<ProductCategory>;
}

