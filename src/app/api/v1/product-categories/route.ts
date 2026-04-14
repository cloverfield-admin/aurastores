import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";
import {
  createProductCategorySchema,
  listProductCategoriesSchema,
} from "@/lib/validation/product-categories";

export async function GET(request: Request) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = listProductCategoriesSchema.safeParse({
    includeArchived: url.searchParams.get("includeArchived") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await services.productCategories.list(context, {
    includeArchived: parsed.data.includeArchived,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProductCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const category = await services.productCategories.create(context, parsed.data);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create category.";
    const status = message.includes("already exists") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

