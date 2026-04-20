import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { updateOrganizationBranchSchema } from "@/lib/validation/branches";

export async function GET(_request: Request, ctx: { params: Promise<{ branchId: string }> }) {
  const gate = await requireAppApiCapability("organization");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  if (context.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { branchId } = await ctx.params;
  const branch = await services.branches.getBranchById(context, branchId);
  if (!branch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ branch });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ branchId: string }> }) {
  const gate = await requireAppApiCapability("organization");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  if (context.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateOrganizationBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { branchId } = await ctx.params;
  try {
    const updated = await services.branches.updateBranchById(context, branchId, parsed.data);
    return NextResponse.json({ branch: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update branch.";
    const status = message === "Branch not found." ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

