import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { addStaffByEmailSchema, listStaffDirectorySchema } from "@/lib/validation/staff";

export async function GET(request: Request) {
  const gate = await requireAppApiCapability("staff");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const url = new URL(request.url);
  const parsed = listStaffDirectorySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const result = await services.staff.listDirectory(context, {
    q: parsed.data.q,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const gate = await requireAppApiCapability("staff");
  if (!gate.ok) {
    return gate.response;
  }
  const context = gate.context;

  const body = await request.json().catch(() => null);
  const parsed = addStaffByEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await services.staff.inviteMemberByEmail(context, {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      jobTitle: parsed.data.jobTitle ?? null,
      appRole: parsed.data.appRole,
      branchIds: parsed.data.branchIds,
      capabilities: parsed.data.capabilities ?? undefined,
    });
    if (result.kind === "invited") {
      return NextResponse.json(
        { invitationId: result.invitationId, status: "invited" as const },
        { status: 201 },
      );
    }
    return NextResponse.json(
      {
        membershipId: result.membershipId,
        staffEmployeeCode: result.staffEmployeeCode,
        status: "added" as const,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not invite staff member.";
    const status =
      message.includes("No AuraPharma account") ||
      message.includes("already") ||
      message.includes("member")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
