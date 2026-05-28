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

  const current = await services.onboarding.getCurrent(authUser.id);
  if (!current) {
    return NextResponse.json({ error: "Onboarding context not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const vertical = current.organization.storeVertical;

  try {
    if (vertical === "pharmacy") {
      const pharmacyLicense = formData.get("pharmacyLicense");
      const picCertificate = formData.get("picCertificate");
      const hasPharmacyLicense = isValidFile(pharmacyLicense);
      const hasPicCertificate = isValidFile(picCertificate);

      const updatedOnboarding = await services.onboarding.uploadComplianceDocuments(authUser.id, {
        kind: "pharmacy",
        ...(hasPharmacyLicense ? { pharmacyLicense } : {}),
        ...(hasPicCertificate ? { picCertificate } : {}),
      });
      return NextResponse.json(updatedOnboarding);
    }

    const businessRegistration = formData.get("businessRegistration");
    const tradeLicense = formData.get("tradeLicense");

    if (!isValidFile(businessRegistration) || !isValidFile(tradeLicense)) {
      return NextResponse.json(
        { error: "Both business registration and trade license files are required." },
        { status: 400 },
      );
    }

    const updatedOnboarding = await services.onboarding.uploadComplianceDocuments(authUser.id, {
      kind: "retail",
      businessRegistration,
      tradeLicense,
    });
    return NextResponse.json(updatedOnboarding);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload compliance documents.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
