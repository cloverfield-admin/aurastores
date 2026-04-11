import { NextResponse } from "next/server";
import { getCurrentAppContext } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { addStaffByEmailSchema } from "@/lib/validation/staff";

export async function GET() {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const members = await services.staff.listDirectory(context);
  return NextResponse.json({ members });
}

export async function POST(request: Request) {
  const context = await getCurrentAppContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addStaffByEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await services.staff.addMemberByEmail(context, {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone ?? null,
      jobTitle: parsed.data.jobTitle ?? null,
      appRole: parsed.data.appRole,
      branchId: parsed.data.branchId ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add staff member.";
    const status = message.includes("No AuraPharma account") || message.includes("already") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
