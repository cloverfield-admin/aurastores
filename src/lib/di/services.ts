import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import { billingRepository } from "@/lib/repositories/billing/billing.repository.impl";
import { avatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository.impl";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { BillingService } from "@/lib/services/billing/billing.service";
import { StaffService } from "@/lib/services/staff/staff.service";

export type AppServices = {
  auth: AuthService;
  billing: BillingService;
  staff: StaffService;
};

export const services: AppServices = {
  auth: new AuthService({ auth: authRepository, avatarStorage: avatarStorageRepository }),
  billing: new BillingService({ billing: billingRepository }),
  staff: new StaffService({ staff: staffRepository, documentStorage: documentStorageRepository }),
};
