import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { updateProductSchema } from "@/lib/validation/products";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { productId } = await context.params;

  try {
    const product = await services.products.getById(appContext, productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch product." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("stock");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { productId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const product = await services.products.update(appContext, productId, parsed.data);
    return NextResponse.json(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product.";
    const status =
      message.includes("already assigned") ? 409 : message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

