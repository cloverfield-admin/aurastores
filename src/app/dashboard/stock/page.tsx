import type { Metadata } from "next";
import { StockInventoryContent } from "@/components/dashboard/stock-inventory-content";

export const metadata: Metadata = {
  title: "Stock Inventory | AuraPharma",
  description:
    "Manage pharmacy stock, track batches, and monitor expiry across all branches.",
};

export default function AuraStockPage() {
  return <StockInventoryContent />;
}
