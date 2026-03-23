import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { salesRepository } from "@/lib/repositories/sales.repository";
import { createSaleSchema } from "@/lib/validation/sales";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch") ?? undefined;
  const dashboard = await salesRepository.getDashboard(context, branchId);
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

  try {
    const sale = await salesRepository.createSale(context, parsed.data);
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create sale.",
      },
      { status: 400 },
    );
  }
}
