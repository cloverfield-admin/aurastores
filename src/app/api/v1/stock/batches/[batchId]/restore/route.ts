import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { disposeStockBatchSchema } from "@/lib/validation/stock";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = disposeStockBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid restore payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { batchId } = await context.params;

  try {
    const batch = await services.stock.restoreDisposedBatch(
      appContext,
      batchId,
      parsed.data.note,
      parsed.data.branchId,
    );
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to restore batch.",
      },
      { status: 400 },
    );
  }
}
