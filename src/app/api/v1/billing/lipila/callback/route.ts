import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { subscriptionInvoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { services } from "@/lib/di";
import { lipilaCallbackSchema } from "@/lib/validation/billing";

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

function extractInvoiceIdentifierFromLipilaReferenceId(referenceId: string): string | null {
  // Momo collections referenceId we generate:
  //   ap_${invoice.identifier}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}
  // We want the middle `${invoice.identifier}` part even though it contains underscores.
  const match = referenceId.match(/^ap_(.+)_([0-9a-z]+)_([0-9a-z]{6})$/i);
  const fullExtract = match?.[1] ?? null;
  if (fullExtract) return fullExtract;

  // Fallback: extract the embedded invoice identifier substring.
  // For our generated invoices: inv_<now36>_<rand8>
  const embeddedMatch = referenceId.match(/(inv_[0-9a-z]+_[0-9a-z]+)/i);
  return embeddedMatch?.[1] ?? null;
}

function hasValidCallbackToken(request: Request): boolean {
  const expected = process.env.LIPILA_CALLBACK_TOKEN;
  if (!expected) {
    return true;
  }
  const headerToken = request.headers.get("x-lipila-callback-token")?.trim();
  if (headerToken && headerToken === expected) {
    return true;
  }
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() === expected;
  }
  return false;
}

export async function POST(request: Request) {
  const logId = `lipila-callback-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  if (!hasValidCallbackToken(request)) {
    console.warn("[billing][lipila] callback unauthorized", {
      logId,
      hasHeaderToken: Boolean(request.headers.get("x-lipila-callback-token")),
      hasAuthHeader: Boolean(request.headers.get("authorization")),
    });
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch (e) {
    console.warn("[billing][lipila] callback JSON parse failed", {
      logId,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  console.info("[billing][lipila] callback incoming request", {
    logId,
    headers: {
      "content-type": request.headers.get("content-type"),
      "x-lipila-callback-token": request.headers.get("x-lipila-callback-token") ? "present" : "missing",
      authorization: request.headers.get("authorization") ? "present" : "missing",
      "user-agent": request.headers.get("user-agent"),
    },
    body: maskSensitiveKeys(body),
  });

  const parsed = lipilaCallbackSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("[billing][lipila] callback payload invalid", {
      logId,
      // Avoid logging full payload; schema errors usually include only relevant fields.
      issues: parsed.error.flatten(),
    });
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  const callbackIdentifier = parsed.data.identifier?.trim() || null;
  const callbackReferenceId = parsed.data.referenceId?.trim() || null;

  const extractedInvoiceIdentifier = callbackReferenceId
    ? extractInvoiceIdentifierFromLipilaReferenceId(callbackReferenceId)
    : null;

  const invoiceIdentifier =
    extractedInvoiceIdentifier ??
    // For card flow we *may* receive our invoice identifier directly as `identifier`.
    // Only accept it if it looks like our invoice identifier shape.
    (callbackIdentifier && /^inv_[0-9a-z]+_[0-9a-z]+$/i.test(callbackIdentifier) ? callbackIdentifier : null);

  if (!invoiceIdentifier) {
    console.warn("[billing][lipila] callback missing identifier", {
      logId,
      received: {
        identifier: callbackIdentifier,
        referenceId: callbackReferenceId,
      },
      extraction: {
        extractedInvoiceIdentifier,
        acceptedCallbackIdentifier: Boolean(callbackIdentifier && /^inv_[0-9a-z]+_[0-9a-z]+$/i.test(callbackIdentifier)),
      },
    });
    return NextResponse.json(
      { error: "Invoice identifier is required." },
      { status: 400 },
    );
  }

  console.info("[billing][lipila] callback received", {
    logId,
    identifier: maskValue(invoiceIdentifier),
    status: parsed.data.status,
    hasExternalId: Boolean(parsed.data.externalId?.trim()),
    hasReferenceId: Boolean(parsed.data.referenceId?.trim()),
  });

  const invoice = await services.billing.findInvoiceByIdentifier(invoiceIdentifier);

  if (!invoice) {
    console.warn("[billing][lipila] invoice not found", {
      logId,
      identifier: maskValue(invoiceIdentifier),
    });
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  // Idempotency: if already paid, accept and store the callback anyway.
  console.info("[billing][lipila] callback recorded (pre-status update)", {
    logId,
    invoiceId: maskValue(invoice.id),
    invoiceIdentifier: maskValue(invoice.identifier),
    callbackStatus: parsed.data.status,
  });
  await services.billing.recordLipilaCallback(invoice.id, parsed.data);

  const status = parsed.data.status?.toLowerCase();
  if (status === "successful") {
    const fresh = await db.query.subscriptionInvoices.findFirst({
      where: eq(subscriptionInvoices.id, invoice.id),
    });
    if (fresh && fresh.status !== "paid") {
      const paidAt = new Date();
      await services.billing.markInvoicePaid(invoice.id, paidAt);
      await services.billing.activateOrgPlanFromInvoice(invoice.id);
      console.info("[billing][lipila] invoice marked paid + plan activated", {
        logId,
        invoiceId: maskValue(invoice.id),
      });
    } else {
      console.info("[billing][lipila] successful callback ignored (already paid or invoice missing)", {
        logId,
        invoiceId: maskValue(invoice.id),
        currentStatus: fresh?.status ?? null,
      });
    }
  } else if (status === "failed") {
    await db
      .update(subscriptionInvoices)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(subscriptionInvoices.id, invoice.id));
    console.info("[billing][lipila] invoice marked failed", {
      logId,
      invoiceId: maskValue(invoice.id),
    });
  } else {
    console.info("[billing][lipila] callback status not recognized; no status update", {
      logId,
      invoiceId: maskValue(invoice.id),
      status: parsed.data.status,
    });
  }

  return NextResponse.json({ ok: true });
}

