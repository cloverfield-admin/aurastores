import type { Metadata } from "next";
import { AuraPayTransactionDetailContent } from "@/components/dashboard/aura-pay-transaction-detail-content";

export const metadata: Metadata = {
  title: "Aura Pay Transaction",
  description: "View Aura Pay transaction details and purchased item quantities.",
};

type PageProps = {
  params: Promise<{ paymentId: string }>;
};

export default async function AuraPayTransactionPage({ params }: PageProps) {
  const { paymentId } = await params;
  return <AuraPayTransactionDetailContent paymentId={paymentId} />;
}
