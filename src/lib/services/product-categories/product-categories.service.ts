import type { ProductCategoriesRepository } from "@/lib/repositories/product-categories/product-categories.repository";

export class ProductCategoriesService {
  constructor(private readonly repos: { productCategories: ProductCategoriesRepository }) {}

  list(
    ...args: Parameters<ProductCategoriesRepository["list"]>
  ): ReturnType<ProductCategoriesRepository["list"]> {
    return this.repos.productCategories.list(...args);
  }

  create(
    ...args: Parameters<ProductCategoriesRepository["create"]>
  ): ReturnType<ProductCategoriesRepository["create"]> {
    return this.repos.productCategories.create(...args);
  }

  update(
    ...args: Parameters<ProductCategoriesRepository["update"]>
  ): ReturnType<ProductCategoriesRepository["update"]> {
    return this.repos.productCategories.update(...args);
  }

  archive(
    ...args: Parameters<ProductCategoriesRepository["archive"]>
  ): ReturnType<ProductCategoriesRepository["archive"]> {
    return this.repos.productCategories.archive(...args);
  }

  restore(
    ...args: Parameters<ProductCategoriesRepository["restore"]>
  ): ReturnType<ProductCategoriesRepository["restore"]> {
    return this.repos.productCategories.restore(...args);
  }
}

