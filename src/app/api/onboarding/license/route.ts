import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";

function isValidFile(file: unknown): file is File {
  return file instanceof File && file.size > 0;
}

export async function POST(request: Request) {
  const authUser = await getCurrentSupabaseUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const pharmacyLicense = formData.get("pharmacyLicense");
  const picCertificate = formData.get("picCertificate");

  if (!isValidFile(pharmacyLicense) || !isValidFile(picCertificate)) {
    return NextResponse.json(
      { error: "Both the pharmacy operation license and PIC certificate are required." },
      { status: 400 },
    );
  }

  try {
    const updatedOnboarding = await services.onboarding.uploadComplianceDocuments(authUser.id, {
      pharmacyLicense,
      picCertificate,
    });
    return NextResponse.json(updatedOnboarding);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload compliance documents.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
