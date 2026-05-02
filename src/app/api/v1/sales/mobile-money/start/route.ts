import { NextResponse } from "next/server";
import { withIdempotentMutation } from "@/lib/api/idempotency";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { createLipilaGlobalWalletClient } from "@/lib/billing/lipila-client";
import { db } from "@/lib/db";
import { lipilaPaymentTransactions, payments } from "@/lib/db/schema";
import { services } from "@/lib/di";
import { calculateCollectionFee } from "@/lib/lipila/fees";
import { buildLipilaReference, maskAccountNumber } from "@/lib/lipila/utils";
import { processLipilaPaymentCallback } from "@/lib/lipila/payment-processing";
import { getSiteUrl } from "@/lib/site-url";
import { PAYMENT_REFERENCE_PREFIX } from "@/lib/brand";
import { normalizeLipilaStatus } from "@/lib/validation/lipila";
import { startSaleMobileMoneySchema } from "@/lib/validation/sales";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("sales");
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startSaleMobileMoneySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mobile money sale payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return withIdempotentMutation(
    request,
    gate.context.organization.id,
    "sales:mobile-money:start",
    parsed.data,
    async () => {
      const referenceId = buildLipilaReference("sale_momo");
      const pendingSale = await services.sales.createSale(gate.context, {
        ...parsed.data.sale,
        mobile: parsed.data.sale.mobile ?? parsed.data.mobileMoneyNumber,
        paymentMethod: "mobile-money",
        paymentReference: referenceId,
        status: "draft",
      });

      const payment = await db.query.payments.findFirst({
        where: eq(payments.saleId, pendingSale.id),
      });
      if (!payment) {
        return { status: 400, body: { error: "Unable to initialize mobile money payment." } };
      }

      const fee = calculateCollectionFee({
        saleTotalCents: pendingSale.totalCents,
        customerPaysFee: parsed.data.customerPaysLipilaFee,
      });

      const callbackUrl = `${getSiteUrl()}/api/v1/pay/lipila/callback`;
      const lipilaPayload = {
        referenceId,
        amount: fee.grossAmountCents / 100,
        narration: `${PAYMENT_REFERENCE_PREFIX} sale ${pendingSale.saleNumber}`,
        accountNumber: parsed.data.mobileMoneyNumber,
        currency: "ZMW",
        email: gate.context.user.email,
      };

      await db.insert(lipilaPaymentTransactions).values({
        organizationId: gate.context.organization.id,
        paymentId: payment.id,
        operation: "sale_collection",
        referenceId,
        status: "pending",
        amountCents: fee.grossAmountCents,
        grossAmountCents: fee.grossAmountCents,
        feeCents: fee.feeCents,
        netAmountCents: fee.netAmountCents,
        feeBps: fee.feeBps,
        feePayer: fee.feePayer,
        currency: "ZMW",
        accountNumberMasked: maskAccountNumber(parsed.data.mobileMoneyNumber),
        rawPayload: lipilaPayload,
      });

      try {
        const lipila = createLipilaGlobalWalletClient();
        const result = await lipila.startMobileMoneyCollection(lipilaPayload, { callbackUrl });
        const returnedReferenceId = result?.referenceId?.trim() || referenceId;
        const providerStatus = normalizeLipilaStatus(result?.status);

        await db
          .update(lipilaPaymentTransactions)
          .set({
            referenceId: returnedReferenceId,
            identifier: result?.identifier ?? null,
            externalId: result?.externalId ?? null,
            status: providerStatus,
            message: result?.message ?? null,
            rawPayload: result,
            updatedAt: new Date(),
          })
          .where(eq(lipilaPaymentTransactions.referenceId, referenceId));

        if (providerStatus !== "pending") {
          await processLipilaPaymentCallback({
            ...result,
            referenceId: returnedReferenceId,
          });
        }

        return {
          status: 201,
          body: {
            saleId: pendingSale.id,
            saleNumber: pendingSale.saleNumber,
            paymentId: payment.id,
            referenceId: returnedReferenceId,
            status: providerStatus,
            message: result?.message ?? "Approve the payment prompt on the customer's phone.",
            fee,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not start mobile money collection.";
        await processLipilaPaymentCallback({
          referenceId,
          status: "Failed",
          message,
        });
        return { status: 400, body: { error: message } };
      }
    },
  );
}
