import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { createStockBatchesSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

