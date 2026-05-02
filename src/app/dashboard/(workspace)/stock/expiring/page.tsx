import type { Metadata } from "next";
import { ItemsNearExpiryContent } from "@/components/dashboard/items-near-expiry-content";

export const metadata: Metadata = {
  title: "Items Near Expiry",
  description:
    "Review and manage products expiring soon or already expired across branches.",
};

export default function ItemsNearExpiryPage() {
  return <ItemsNearExpiryContent />;
}
