import type { Metadata } from "next";
import { ItemsNearExpiryContent } from "@/components/dashboard/items-near-expiry-content";

export const metadata: Metadata = {
  title: "Items Near Expiry | AuraPharma",
  description:
    "Review and manage pharmacy stock batches expiring soon or already expired.",
};

export default function ItemsNearExpiryPage() {
  return <ItemsNearExpiryContent />;
}
