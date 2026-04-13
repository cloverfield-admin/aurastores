import type { Metadata } from "next";
import { BulkAddBatchesContent } from "@/components/dashboard/bulk-add-batches-content";

export const metadata: Metadata = {
  title: "Bulk Add Products",
  description: "Add multiple products to inventory in one submission.",
};

export default function StockBulkAddPage() {
  return <BulkAddBatchesContent />;
}

