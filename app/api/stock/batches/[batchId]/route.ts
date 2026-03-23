import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const appContext = await getCurrentAppContext();

  if (!appContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { batchId } = await context.params;

  try {
    const batch = await stockRepository.getBatchById(appContext, batchId);

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to fetch batch.",
      },
      { status: 400 },
    );
  }
}
