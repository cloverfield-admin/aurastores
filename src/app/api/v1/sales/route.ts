import { NextResponse } from "next/server";
import { withIdempotentMutation } from "@/lib/api/idempotency";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { createSaleSchema } from "@/lib/validation/sales";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const dashboard = await services.sales.getDashboard(context, branchId);
  return NextResponse.json(dashboard);
}

export async function POST(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSaleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid sale payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  return withIdempotentMutation(request, context.organization.id, "sales:create", parsed.data, async () => {
    try {
      const sale = await services.sales.createSale(context, parsed.data);
      return { status: 201, body: sale };
    } catch (error) {
      return {
        status: 400,
        body: {
          error: error instanceof Error ? error.message : "Unable to create sale.",
        },
      };
    }
  });
}
