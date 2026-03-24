import { branchOperatingHours } from "@/lib/db/schema";
import type { IdentityInput, PharmacyDetailsInput } from "@/lib/validation/onboarding";

export type OnboardingComplianceDocumentPayload = {
  documentType: "pharmacy_operation_license" | "pharmacist_in_charge_certificate";
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export type OnboardingSnapshot = {
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
  organization: {
    id: string;
    displayName: string;
    legalName: string;
    taxId: string;
    primaryEmail: string;
    primaryPhone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  onboarding: {
    status: string;
    currentStep: string;
    furthestStepIndex: number;
  };
  mainBranch: null | {
    id: string;
    branchName: string;
    pharmacistCount: number;
    branchLocation: string | null;
    hoursMode: "24-7" | "custom";
    operatingHours: Array<typeof branchOperatingHours.$inferSelect>;
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    status: string;
    createdAt: Date;
  }>;
};

export interface OnboardingRepository {
  getCurrent(authUserId: string): Promise<OnboardingSnapshot | null>;
  saveIdentity(authUserId: string, input: IdentityInput): Promise<OnboardingSnapshot>;
  savePharmacyDetails(authUserId: string, input: PharmacyDetailsInput): Promise<OnboardingSnapshot>;
  saveComplianceDocuments(
    authUserId: string,
    docs: OnboardingComplianceDocumentPayload[],
  ): Promise<OnboardingSnapshot>;
  complete(authUserId: string): Promise<OnboardingSnapshot>;
}
