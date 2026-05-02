import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { UpdateProductInput } from "@/lib/validation/products";

export type ProductDetail = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  categoryId: string | null;
  categoryName: string;
  defaultSellingPriceCents: number;
  status: "active" | "discontinued";
};

export type ProductUpdateInput = UpdateProductInput;

export interface ProductsRepository {
  getById(context: AuthContext, productId: string): Promise<ProductDetail | null>;
  update(context: AuthContext, productId: string, input: ProductUpdateInput): Promise<ProductDetail>;
}

