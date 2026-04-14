import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { updateProductCategorySchema } from "@/lib/validation/product-categories";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { categoryId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = await services.productCategories.update(context, categoryId, parsed.data);
    return NextResponse.json(category);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update category.";
    const status = message.includes("already exists") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

