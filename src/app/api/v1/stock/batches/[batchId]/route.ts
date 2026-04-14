import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { batchId } = await context.params;

  try {
    const batch = await services.stock.getBatchById(appContext, batchId);

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
