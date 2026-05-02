import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { createOrganizationBranchSchema } from "@/lib/validation/branches";

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("organization");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  if (context.membership.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrganizationBranchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const created = await services.branches.createOrganizationBranch(context, parsed.data);
    return NextResponse.json({ branch: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create branch.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

