import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import type { NetworkRepository } from "@/lib/repositories/network/network.repository";
import { networkRepository } from "@/lib/repositories/network/network.repository.impl";
import type { PharmacySearchRepository } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository";
import { pharmacySearchRepository } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository.impl";
import type { OnboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository";
import { onboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository.impl";
import type { ProductCategoriesRepository } from "@/lib/repositories/product-categories/product-categories.repository";
import { productCategoriesRepository } from "@/lib/repositories/product-categories/product-categories.repository.impl";
import type { SalesRepository } from "@/lib/repositories/sales/sales.repository";
import { salesRepository } from "@/lib/repositories/sales/sales.repository.impl";
import type { StaffRepository } from "@/lib/repositories/staff/staff.repository";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import type { StockRepository } from "@/lib/repositories/stock/stock.repository";
import { stockRepository } from "@/lib/repositories/stock/stock.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { NetworkService } from "@/lib/services/network/network.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { ProductCategoriesService } from "@/lib/services/product-categories/product-categories.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StaffService } from "@/lib/services/staff/staff.service";
import { PharmacySearchService } from "@/lib/services/pharmacy-search/pharmacy-search.service";
import { StockService } from "@/lib/services/stock/stock.service";
import type { AppServices } from "@/lib/di/services";

/** Builds services with optional repository overrides; uses production impl singletons for the rest (requires env e.g. DATABASE_URL when loaded). */
export type TestServiceOverrides = Partial<{
  auth: AuthRepository;
  stock: StockRepository;
  sales: SalesRepository;
  onboarding: OnboardingRepository;
  documentStorage: DocumentStorageRepository;
  staff: StaffRepository;
  network: NetworkRepository;
  pharmacySearch: PharmacySearchRepository;
  productCategories: ProductCategoriesRepository;
}>;

export function createTestServices(overrides: TestServiceOverrides = {}): AppServices {
  const auth = overrides.auth ?? authRepository;
  const stock = overrides.stock ?? stockRepository;
  const sales = overrides.sales ?? salesRepository;
  const onboarding = overrides.onboarding ?? onboardingRepository;
  const documentStorage = overrides.documentStorage ?? documentStorageRepository;
  const staff = overrides.staff ?? staffRepository;
  const network = overrides.network ?? networkRepository;
  const pharmacySearch = overrides.pharmacySearch ?? pharmacySearchRepository;
  const productCategories = overrides.productCategories ?? productCategoriesRepository;

  return {
    auth: new AuthService({ auth }),
    stock: new StockService({ stock }),
    sales: new SalesService({ sales }),
    onboarding: new OnboardingService({ onboarding, documentStorage }),
    staff: new StaffService({ staff }),
    network: new NetworkService({ network }),
    pharmacySearch: new PharmacySearchService({ pharmacySearch }),
    productCategories: new ProductCategoriesService({ productCategories }),
  };
}
