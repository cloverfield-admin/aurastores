import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";
import { disposeStockBatchSchema } from "@/lib/validation/stock";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const appContext = await getCurrentAppContext();

  if (!appContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = disposeStockBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid disposal payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { batchId } = await context.params;

  try {
    const batch = await stockRepository.disposeBatch(
      appContext,
      batchId,
      parsed.data.note,
      parsed.data.branchId,
    );
    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to dispose batch.",
      },
      { status: 400 },
    );
  }
}
