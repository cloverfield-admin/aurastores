import type { Metadata } from "next";
import { ProductEditContent } from "@/components/dashboard/product-edit-content";

export const metadata: Metadata = {
  title: "Edit Product",
  description: "Update product details used across your stock catalog.",
};

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function EditStockProductPage({ params }: PageProps) {
  const { productId } = await params;
  return <ProductEditContent productId={productId} />;
}

