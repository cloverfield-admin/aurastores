import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const gate = await requireAppApiCapability("catalog");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const { categoryId } = await params;
  try {
    const category = await services.productCategories.restore(context, categoryId);
    return NextResponse.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to restore category.";
    const status =
      message.includes("already exists") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

