import type { ProductsRepository } from "@/lib/repositories/products/products.repository";

export class ProductsService {
  constructor(private readonly repos: { products: ProductsRepository }) {}

  getById(
    ...args: Parameters<ProductsRepository["getById"]>
  ): ReturnType<ProductsRepository["getById"]> {
    return this.repos.products.getById(...args);
  }

  update(
    ...args: Parameters<ProductsRepository["update"]>
  ): ReturnType<ProductsRepository["update"]> {
    return this.repos.products.update(...args);
  }
}

