import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { stockRepository } from "@/lib/repositories/stock.repository";
import { createStockBatchSchema } from "@/lib/validation/stock";

export async function POST(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createStockBatchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid stock batch payload.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const batch = await stockRepository.createBatch(context, parsed.data);
    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create batch.",
      },
      { status: 400 },
    );
  }
}
