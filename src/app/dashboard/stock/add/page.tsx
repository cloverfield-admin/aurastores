import type { Metadata } from "next";
import { AddNewBatchContent } from "@/components/dashboard/add-new-batch-content";

export const metadata: Metadata = {
  title: "Add New Product",
  description:
    "Register new stock with product specification, logistics, and pricing.",
};

export default function StockAddPage() {
  return <AddNewBatchContent />;
}
