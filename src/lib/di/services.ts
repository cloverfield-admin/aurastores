import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import { networkRepository } from "@/lib/repositories/network/network.repository.impl";
import { pharmacySearchRepository } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository.impl";
import { onboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository.impl";
import { productCategoriesRepository } from "@/lib/repositories/product-categories/product-categories.repository.impl";
import { salesRepository } from "@/lib/repositories/sales/sales.repository.impl";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import { stockRepository } from "@/lib/repositories/stock/stock.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { NetworkService } from "@/lib/services/network/network.service";
import { PharmacySearchService } from "@/lib/services/pharmacy-search/pharmacy-search.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { ProductCategoriesService } from "@/lib/services/product-categories/product-categories.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StaffService } from "@/lib/services/staff/staff.service";
import { StockService } from "@/lib/services/stock/stock.service";

export type AppServices = {
  auth: AuthService;
  stock: StockService;
  sales: SalesService;
  onboarding: OnboardingService;
  staff: StaffService;
  network: NetworkService;
  pharmacySearch: PharmacySearchService;
  productCategories: ProductCategoriesService;
};

export const services: AppServices = {
  auth: new AuthService({ auth: authRepository }),
  stock: new StockService({ stock: stockRepository }),
  sales: new SalesService({ sales: salesRepository }),
  onboarding: new OnboardingService({
    onboarding: onboardingRepository,
    documentStorage: documentStorageRepository,
  }),
  staff: new StaffService({ staff: staffRepository }),
  network: new NetworkService({ network: networkRepository }),
  pharmacySearch: new PharmacySearchService({ pharmacySearch: pharmacySearchRepository }),
  productCategories: new ProductCategoriesService({ productCategories: productCategoriesRepository }),
};
