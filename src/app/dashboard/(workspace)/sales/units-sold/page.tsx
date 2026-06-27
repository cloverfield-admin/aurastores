import type { Metadata } from "next";
import { SalesUnitsSoldContent } from "@/components/dashboard/sales-units-sold-content";

export const metadata: Metadata = {
  title: "Units Sold",
  description: "Line-item view of products sold across completed sales.",
};

export default function SalesUnitsSoldPage() {
  return <SalesUnitsSoldContent />;
}
