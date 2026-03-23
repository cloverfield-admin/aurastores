import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";
import { stockAdjustmentSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    const result = await stockRepository.adjustBatches(context, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to apply stock adjustment.",
      },
      { status: 400 },
    );
  }
}
