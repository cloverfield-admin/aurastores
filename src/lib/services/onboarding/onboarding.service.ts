import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import type {
  OnboardingComplianceDocumentPayload,
  OnboardingRepository,
} from "@/lib/repositories/onboarding/onboarding.repository";
import type { IdentityInput, LocationDetailsInput } from "@/lib/validation/onboarding";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

export type PharmacyComplianceUploadFiles = {
  kind: "pharmacy";
  pharmacyLicense?: File;
  picCertificate?: File;
};

export type RetailComplianceUploadFiles = {
  kind: "retail";
  businessRegistration: File;
  tradeLicense: File;
};

export type ComplianceUploadFiles = PharmacyComplianceUploadFiles | RetailComplianceUploadFiles;

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

  saveLocationDetails(authUserId: string, input: LocationDetailsInput) {
    return this.repos.onboarding.saveLocationDetails(authUserId, input);
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

    const vertical = currentOnboarding.organization.storeVertical;

    if (files.kind === "pharmacy") {
      if (vertical !== "pharmacy") {
        throw new Error("Pharmacy license uploads are only for pharmacy organizations.");
      }

      const docs: OnboardingComplianceDocumentPayload[] = [];

      if (files.pharmacyLicense) {
        this.validateComplianceFile(files.pharmacyLicense);
        docs.push({
          documentType: "pharmacy_operation_license",
          ...(await this.repos.documentStorage.upload({
            organizationId: currentOnboarding.organization.id,
            userId: authUserId,
            file: files.pharmacyLicense,
            prefix: "pharmacy-operation-license",
          })),
        });
      }

      if (files.picCertificate) {
        this.validateComplianceFile(files.picCertificate);
        docs.push({
          documentType: "pharmacist_in_charge_certificate",
          ...(await this.repos.documentStorage.upload({
            organizationId: currentOnboarding.organization.id,
            userId: authUserId,
            file: files.picCertificate,
            prefix: "pharmacist-in-charge-certificate",
          })),
        });
      }

      return this.repos.onboarding.saveComplianceDocuments(authUserId, docs);
    }

    if (vertical !== "general_retail") {
      throw new Error("Retail business document uploads are only for general retail organizations.");
    }
    this.validateComplianceFile(files.businessRegistration);
    this.validateComplianceFile(files.tradeLicense);

    const [savedReg, savedTrade] = await Promise.all([
      this.repos.documentStorage.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUserId,
        file: files.businessRegistration,
        prefix: "business-registration",
      }),
      this.repos.documentStorage.upload({
        organizationId: currentOnboarding.organization.id,
        userId: authUserId,
        file: files.tradeLicense,
        prefix: "trade-license",
      }),
    ]);

    return this.repos.onboarding.saveComplianceDocuments(authUserId, [
      {
        documentType: "business_registration",
        ...savedReg,
      },
      {
        documentType: "trade_license",
        ...savedTrade,
      },
    ]);
  }
}
