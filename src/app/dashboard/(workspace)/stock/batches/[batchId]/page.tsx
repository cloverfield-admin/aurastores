import type { Metadata } from "next";
import { BatchDetailContent } from "@/components/dashboard/batch-detail-content";

export const metadata: Metadata = {
  title: "Product Details",
  description: "View product details, stock levels, and transaction history.",
};

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function BatchDetailPage({ params }: PageProps) {
  const { batchId } = await params;
  return <BatchDetailContent batchId={batchId} />;
}
