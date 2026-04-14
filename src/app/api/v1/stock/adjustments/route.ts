import { NextResponse } from "next/server";
import { withIdempotentMutation } from "@/lib/api/idempotency";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { stockAdjustmentSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = stockAdjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid stock adjustment payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  return withIdempotentMutation(
    request,
    context.organization.id,
    "stock:adjustment",
    parsed.data,
    async () => {
      try {
        const result = await services.stock.adjustBatches(context, parsed.data);
        return { status: 200, body: result };
      } catch (error) {
        return {
          status: 400,
          body: {
            error: error instanceof Error ? error.message : "Unable to apply stock adjustment.",
          },
        };
      }
    },
  );
}
