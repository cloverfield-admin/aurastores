import { NextResponse } from "next/server";
import { getCurrentSupabaseUser } from "@/lib/auth/session";
import { documentStorageRepository } from "@/lib/repositories/document-storage.repository";
import { onboardingRepository } from "@/lib/repositories/onboarding.repository";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

function isValidFile(file: unknown): file is File {
  return file instanceof File && file.size > 0;
}

function validateFile(file: File) {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} exceeds the 10MB limit.`);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`${file.name} has an unsupported file type.`);
  }
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
    const currentOnboarding = await onboardingRepository.getCurrent(authUser.id);
    if (!currentOnboarding) {
      throw new Error("Onboarding context not found.");
    }

    validateFile(pharmacyLicense);
    validateFile(picCertificate);

    const [savedLicense, savedPic] = await Promise.all([
      documentStorageRepository.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUser.id,
        file: pharmacyLicense,
        prefix: "pharmacy-operation-license",
      }),
      documentStorageRepository.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUser.id,
        file: picCertificate,
        prefix: "pharmacist-in-charge-certificate",
      }),
    ]);

    const updatedOnboarding = await onboardingRepository.saveComplianceDocuments(authUser.id, [
      {
        documentType: "pharmacy_operation_license",
        ...savedLicense,
      },
      {
        documentType: "pharmacist_in_charge_certificate",
        ...savedPic,
      },
    ]);

    return NextResponse.json(updatedOnboarding);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload compliance documents.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
