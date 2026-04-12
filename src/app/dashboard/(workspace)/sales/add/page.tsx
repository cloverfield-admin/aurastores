import type { Metadata } from "next";
import { NewSaleContent } from "@/components/dashboard/new-sale-content";

export const metadata: Metadata = {
  title: "New Sale",
  description:
    "Record a new sale with customer details, line items, payment, and cart summary.",
};

export default function SalesAddPage() {
  return <NewSaleContent />;
}
