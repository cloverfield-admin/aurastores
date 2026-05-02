import type { Metadata } from "next";
import { NetworkOverviewContent } from "@/components/dashboard/network-overview-content";

export const metadata: Metadata = {
  title: "Network Overview",
  description:
    "Real-time operational pulse across inventory, sales, and staff for every active branch.",
};

export default function DashboardNetworkOverviewPage() {
  return <NetworkOverviewContent />;
}
