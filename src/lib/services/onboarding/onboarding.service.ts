import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import type { OnboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository";
import type { IdentityInput, PharmacyDetailsInput } from "@/lib/validation/onboarding";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export type ComplianceUploadFiles = {
  pharmacyLicense: File;
  picCertificate: File;
};

export class OnboardingService {
  constructor(
    private readonly repos: {
      onboarding: OnboardingRepository;
      documentStorage: DocumentStorageRepository;
    },
  ) {}

  getCurrent(authUserId: string) {
    return this.repos.onboarding.getCurrent(authUserId);
  }

  saveIdentity(authUserId: string, input: IdentityInput) {
    return this.repos.onboarding.saveIdentity(authUserId, input);
  }

  savePharmacyDetails(authUserId: string, input: PharmacyDetailsInput) {
    return this.repos.onboarding.savePharmacyDetails(authUserId, input);
  }

  complete(authUserId: string) {
    return this.repos.onboarding.complete(authUserId);
  }

  private validateComplianceFile(file: File) {
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} exceeds the 10MB limit.`);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      throw new Error(`${file.name} has an unsupported file type.`);
    }
  }

  async uploadComplianceDocuments(authUserId: string, files: ComplianceUploadFiles) {
    const currentOnboarding = await this.repos.onboarding.getCurrent(authUserId);
    if (!currentOnboarding) {
      throw new Error("Onboarding context not found.");
    }

    this.validateComplianceFile(files.pharmacyLicense);
    this.validateComplianceFile(files.picCertificate);

    const [savedLicense, savedPic] = await Promise.all([
      this.repos.documentStorage.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUserId,
        file: files.pharmacyLicense,
        prefix: "pharmacy-operation-license",
      }),
      this.repos.documentStorage.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUserId,
        file: files.picCertificate,
        prefix: "pharmacist-in-charge-certificate",
      }),
    ]);

    return this.repos.onboarding.saveComplianceDocuments(authUserId, [
      {
        documentType: "pharmacy_operation_license",
        ...savedLicense,
      },
      {
        documentType: "pharmacist_in_charge_certificate",
        ...savedPic,
      },
    ]);
  }
}
