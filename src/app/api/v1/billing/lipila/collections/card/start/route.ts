import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLipilaClient } from "@/lib/billing/lipila-client";
import { startLipilaCardCollectionSchema } from "@/lib/validation/billing";
import { services } from "@/lib/di";
import { getSiteUrl } from "@/lib/site-url";

function maskValue(value: string, head = 6, tail = 4): string {
  if (!value) return "";
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function maskSensitiveKeys(input: unknown): unknown {
  const SENSITIVE_KEYS = new Set([
    "authorization",
    "x-lipila-callback-token",
    "lipilaCallbackToken",
    "token",
    "clientSecret",
    "checkoutUrl",
    "cardNumber",
    "pan",
    "cvv",
    "msisdn",
    "accountNumber",
    "email",
    "phone",
    "ipAddress",
  ]);

  const maskAnyString = (v: unknown) => {
    if (typeof v !== "string") return v;
    return maskValue(v, 4, 2);
  };

  const walk = (value: unknown, depth: number): unknown => {
    if (depth > 6) return value;
    if (value === null || value === undefined) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;

    if (Array.isArray(value)) {
      return value.map((v) => walk(v, depth + 1));
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(k)) {
          out[k] = maskAnyString(v);
        } else {
          out[k] = walk(v, depth + 1);
        }
      }
      return out;
    }

    return value;
  };

  return walk(input, 0);
}

export async function POST(request: Request) {
  const gate = await requireAppApiContext();
  if (!gate.ok) {
    return gate.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = startLipilaCardCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const invoice = await db.query.subscriptionInvoices.findFirst({
    where: eq(subscriptionInvoices.id, parsed.data.invoiceId),
  });
  if (!invoice || invoice.organizationId !== gate.context.organization.id) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid." }, { status: 400 });
  }

  const callbackUrl = `${getSiteUrl()}/api/v1/billing/lipila/callback`;
  const returnUrl = parsed.data.returnUrl ?? `${getSiteUrl()}/dashboard/settings/billing`;

  // PCI-safe: we do not collect PAN/CVV. Expect Lipila to return a hosted checkout URL or tokenized flow data.
  const payload = {
    amount: invoice.amountCents / 100,
    currency: invoice.currency,
    identifier: invoice.identifier,
    externalId: invoice.id,
    callbackUrl,
    returnUrl,
    description: `AuraPharma subscription invoice ${invoice.identifier}`,
    type: "Collection",
    paymentMethod: "card",
  };

  try {
    const lipila = createLipilaClient();
    const result = await lipila.startCardCollection(payload);
    const referenceId = (result?.referenceId ?? result?.reference ?? result?.data?.referenceId ?? null) as string | null;
    const checkoutUrl = (result?.checkoutUrl ?? result?.url ?? result?.data?.checkoutUrl ?? null) as string | null;
    const clientSecret = (result?.clientSecret ?? result?.data?.clientSecret ?? null) as string | null;

    console.info("[billing] lipila card start lipila response", {
      referenceIdSent: payload.identifier,
      referenceIdReturned: referenceId,
      lipilaStatus: result?.status,
      lipilaMessage: result?.message ?? result?.data?.message,
      raw: maskSensitiveKeys(result),
    });

    if (referenceId) {
      await services.billing.recordLipilaInitiation(invoice.id, {
        identifier: invoice.identifier,
        referenceId,
        externalId: String(result?.externalId ?? payload.externalId ?? ""),
        message: result?.message ?? null,
        rawPayload: result,
      });
    }

    const response = {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      referenceId,
      checkoutUrl,
      clientSecret,
      message: result?.message ?? "Complete the card payment to activate your plan.",
      raw: result,
    };

    console.info("[billing] lipila card start response to client", {
      referenceId: response.referenceId,
      status: response.raw?.status ?? null,
      message: response.message,
      raw: maskSensitiveKeys(response.raw),
    });

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start card collection.";
    console.error("[billing] lipila card start failed", {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      payload,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

