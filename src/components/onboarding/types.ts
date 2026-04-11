export type OnboardingStepId =
  | "identity"
  | "pharmacy-details"
  | "license"
  | "review";

export type OnboardingDocumentSummary = {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  createdAt: string | Date;
};

export type OnboardingDraft = {
  user: {
    id: string;
    email: string;
    fullName: string;
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
  mainBranch: {
    id: string;
    branchName: string;
    pharmacistCount: number;
    branchLocation: string;
    latitude: number | null;
    longitude: number | null;
    hoursMode: "24-7" | "custom";
    operatingHours: Array<{
      dayOfWeek: number;
      opensAt: string | null;
      closesAt: string | null;
      isClosed: boolean;
    }>;
  } | null;
  documents: OnboardingDocumentSummary[];
};
