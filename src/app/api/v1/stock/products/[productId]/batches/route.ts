import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { productId } = await context.params;
  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;

  try {
    const result = await services.stock.listProductBatches(appContext, productId, branchId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch product batches." },
      { status: 400 },
    );
  }
}

