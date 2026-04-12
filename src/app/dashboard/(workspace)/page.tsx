import type { Metadata } from "next";
import { NetworkOverviewContent } from "@/components/dashboard/network-overview-content";

export const metadata: Metadata = {
  title: "Network Overview",
  description:
    "Real-time clinical and operational pulse across all active branches.",
};

export default function DashboardNetworkOverviewPage() {
  return <NetworkOverviewContent />;
}
