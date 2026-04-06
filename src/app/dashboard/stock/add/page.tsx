import type { Metadata } from "next";
import { AddNewBatchContent } from "@/components/dashboard/add-new-batch-content";

export const metadata: Metadata = {
  title: "Add New Batch",
  description:
    "Register a new medication batch with product specification, logistics, and pricing.",
};

export default function StockAddPage() {
  return <AddNewBatchContent />;
}
