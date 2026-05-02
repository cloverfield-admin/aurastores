import type { Metadata } from "next";
import { StockInventoryContent } from "@/components/dashboard/stock-inventory-content";

export const metadata: Metadata = {
  title: "Stock Inventory",
  description:
    "Manage stock, track products, and monitor expiry across all branches.",
};

export default function AuraStockPage() {
  return <StockInventoryContent />;
}
