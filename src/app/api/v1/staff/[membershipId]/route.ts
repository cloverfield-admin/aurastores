import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { staffMembershipIdParamSchema, updateStaffMemberSchema } from "@/lib/validation/staff";

type RouteContext = {
  params: Promise<{ membershipId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("staff");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { membershipId } = await context.params;
  const parsed = staffMembershipIdParamSchema.safeParse({ membershipId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid membership id." }, { status: 400 });
  }

  try {
    const member = await services.staff.getMemberForEdit(appContext, parsed.data.membershipId);
    if (!member) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }
    return NextResponse.json({
      ...member,
      credentials: member.credentials.map((c) => ({
        id: c.id,
        fileName: c.fileName,
        mimeType: c.mimeType,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load staff member." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("staff");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const { membershipId } = await context.params;
  const parsedId = staffMembershipIdParamSchema.safeParse({ membershipId });
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid membership id." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = updateStaffMemberSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await services.staff.updateMember(appContext, parsedId.data.membershipId, parsedBody.data);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update staff member.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
