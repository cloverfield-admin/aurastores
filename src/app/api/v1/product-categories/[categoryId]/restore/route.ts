import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

