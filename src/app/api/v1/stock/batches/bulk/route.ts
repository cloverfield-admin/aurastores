import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { createStockBatchesSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = createStockBatchesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid bulk stock batch payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const results = await services.stock.createBatches(context, parsed.data);
    const okCount = results.filter((r) => r.ok).length;
    return NextResponse.json(
      {
        results,
        okCount,
        failCount: results.length - okCount,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to bulk create batches.",
      },
      { status: 400 },
    );
  }
}

