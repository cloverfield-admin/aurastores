import type { Metadata } from "next";
import { SalesPerformanceContent } from "@/components/dashboard/sales-performance-content";

export const metadata: Metadata = {
  title: "Aura Sales | AuraPharma",
  description:
    "Monthly sales performance, analytics, and financial tracking across pharmacy branches.",
};

export default function AuraSalesPage() {
  return <SalesPerformanceContent />;
}
