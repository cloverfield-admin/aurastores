import { NextResponse } from "next/server";
import { requireAppApiContext } from "@/lib/auth/require-api-context";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createLipilaClient } from "@/lib/billing/lipila-client";
import { startLipilaMomoCollectionSchema } from "@/lib/validation/billing";
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
  const parsed = startLipilaMomoCollectionSchema.safeParse(body);
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

  // Use canonical origin for callbacks.
  const callbackUrl = `${getSiteUrl()}/api/v1/billing/lipila/callback`;

  // Payload per Lipila MoMo Collections docs:
  // https://docs.lipila.dev/docs/collections/momocollections.html
  const referenceId = `ap_${invoice.identifier}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    referenceId,
    amount: invoice.amountCents / 100,
    narration: `AuraPharma subscription invoice ${invoice.identifier}`,
    accountNumber: parsed.data.msisdn,
    currency: invoice.currency,
    email: gate.context.user.email,
  };

  try {
    const lipila = createLipilaClient();
    console.info("[billing] lipila momo start", {
      endpoint: process.env.LIPILA_MOMO_COLLECTIONS_PATH,
      baseUrl: process.env.LIPILA_BASE_URL,
      apiKeyHint: (process.env.LIPILA_API_KEY ?? "").slice(-4),
      callbackUrl,
      payload,
    });
    const result = await lipila.startMobileMoneyCollection(payload, { callbackUrl });
    const returnedReferenceId = (result?.referenceId ?? payload.referenceId ?? null) as string | null;

    console.info("[billing] lipila momo start lipila response", {
      callbackUrl,
      referenceIdSent: payload.referenceId,
      referenceIdReturned: returnedReferenceId,
      lipilaStatus: result?.status,
      lipilaMessage: result?.message,
      raw: maskSensitiveKeys(result),
    });

    if (returnedReferenceId) {
      await services.billing.recordLipilaInitiation(invoice.id, {
        identifier: invoice.identifier,
        referenceId: returnedReferenceId,
        externalId: invoice.id,
        message: result?.message ?? null,
        rawPayload: result,
      });
    }

    const response = {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      referenceId: returnedReferenceId,
      status: result?.status ?? "Pending",
      message: result?.message ?? "Approve the payment prompt on the customer’s phone.",
      raw: result,
    };

    console.info("[billing] lipila momo start response to client", {
      referenceId: returnedReferenceId,
      status: response.status,
      message: response.message,
      raw: maskSensitiveKeys(response.raw),
    });

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not start mobile money collection.";
    console.error("[billing] lipila momo start failed", {
      invoiceId: invoice.id,
      identifier: invoice.identifier,
      baseUrl: process.env.LIPILA_BASE_URL,
      endpoint: process.env.LIPILA_MOMO_COLLECTIONS_PATH,
      apiKeyHint: (process.env.LIPILA_API_KEY ?? "").slice(-4),
      callbackUrl,
      payload,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

