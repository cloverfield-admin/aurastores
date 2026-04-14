import type { Metadata } from "next";
import { ProductCategoriesContent } from "@/components/dashboard/product-categories-content";

export const metadata: Metadata = {
  title: "Product Categories",
  description: "Manage the organization-wide product category library.",
};

export default function ProductCategoriesPage() {
  return <ProductCategoriesContent />;
}

