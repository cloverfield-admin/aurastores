import { NextResponse } from "next/server";
import { requireAppApiCapability } from "@/lib/auth/require-api-context";
import { services } from "@/lib/di";
import { staffMembershipIdParamSchema } from "@/lib/validation/staff";

type RouteContext = {
  params: Promise<{ membershipId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
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

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with one or more file fields named \"files\"." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  try {
    await services.staff.uploadStaffCredentials(appContext, parsedId.data.membershipId, files);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload credentials.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
