import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { staffCredentialDocumentIdParamSchema } from "@/lib/validation/staff";

type RouteContext = {
  params: Promise<{ membershipId: string; documentId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const gate = await requireAppApiCapability("staff");
  if (!gate.ok) {
    return gate.response;
  }
  const appContext = gate.context;

  const params = await context.params;
  const parsed = staffCredentialDocumentIdParamSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ids." }, { status: 400 });
  }

  try {
    await services.staff.deleteStaffCredential(
      appContext,
      parsed.data.membershipId,
      parsed.data.documentId,
    );
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete credential.";
    const notFound = message === "Staff member not found." || message === "Credential not found.";
    return NextResponse.json({ error: message }, { status: notFound ? 404 : 400 });
  }
}
