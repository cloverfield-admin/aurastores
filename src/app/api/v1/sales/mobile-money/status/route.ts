import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { createLipilaGlobalWalletClient } from "@/lib/billing/lipila-client";
import { getLipilaPaymentTransactionForOrg, processLipilaPaymentCallback } from "@/lib/lipila/payment-processing";

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }

  const url = new URL(request.url);
  const referenceId = url.searchParams.get("referenceId")?.trim();
  if (!referenceId) {
    return NextResponse.json({ error: "referenceId is required." }, { status: 400 });
  }

  let transaction = await getLipilaPaymentTransactionForOrg(gate.context.organization.id, referenceId);
  if (!transaction || transaction.operation !== "sale_collection") {
    return NextResponse.json({ error: "Mobile money transaction not found." }, { status: 404 });
  }

  if (transaction.status === "pending") {
    try {
      const lipila = createLipilaGlobalWalletClient();
      const providerStatus = await lipila.checkCollectionStatus(referenceId);
      if (providerStatus?.status) {
        await processLipilaPaymentCallback(providerStatus);
        transaction = await getLipilaPaymentTransactionForOrg(gate.context.organization.id, referenceId);
      }
    } catch {
      // Callback remains the source of truth; polling may race Lipila before the reference is visible.
    }
  }

  return NextResponse.json({
    referenceId,
    status: transaction?.status ?? "pending",
    message: transaction?.message ?? null,
  });
}
