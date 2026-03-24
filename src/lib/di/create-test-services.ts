import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import type { OnboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository";
import { onboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository.impl";
import type { SalesRepository } from "@/lib/repositories/sales/sales.repository";
import { salesRepository } from "@/lib/repositories/sales/sales.repository.impl";
import type { StockRepository } from "@/lib/repositories/stock/stock.repository";
import { stockRepository } from "@/lib/repositories/stock/stock.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StockService } from "@/lib/services/stock/stock.service";
import type { AppServices } from "@/lib/di/services";

/** Builds services with optional repository overrides; uses production impl singletons for the rest (requires env e.g. DATABASE_URL when loaded). */
export type TestServiceOverrides = Partial<{
  auth: AuthRepository;
  stock: StockRepository;
  sales: SalesRepository;
  onboarding: OnboardingRepository;
  documentStorage: DocumentStorageRepository;
}>;

export function createTestServices(overrides: TestServiceOverrides = {}): AppServices {
  const auth = overrides.auth ?? authRepository;
  const stock = overrides.stock ?? stockRepository;
  const sales = overrides.sales ?? salesRepository;
  const onboarding = overrides.onboarding ?? onboardingRepository;
  const documentStorage = overrides.documentStorage ?? documentStorageRepository;

  return {
    auth: new AuthService({ auth }),
    stock: new StockService({ stock }),
    sales: new SalesService({ sales }),
    onboarding: new OnboardingService({ onboarding, documentStorage }),
  };
}
