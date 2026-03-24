import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import { onboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository.impl";
import { salesRepository } from "@/lib/repositories/sales/sales.repository.impl";
import { stockRepository } from "@/lib/repositories/stock/stock.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StockService } from "@/lib/services/stock/stock.service";

export type AppServices = {
  auth: AuthService;
  stock: StockService;
  sales: SalesService;
  onboarding: OnboardingService;
};

export const services: AppServices = {
  auth: new AuthService({ auth: authRepository }),
  stock: new StockService({ stock: stockRepository }),
  sales: new SalesService({ sales: salesRepository }),
  onboarding: new OnboardingService({
    onboarding: onboardingRepository,
    documentStorage: documentStorageRepository,
  }),
};
