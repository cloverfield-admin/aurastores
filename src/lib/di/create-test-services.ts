import type { AuthRepository } from "@/lib/repositories/auth/auth.repository";
import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import type { AvatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository";
import { avatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository.impl";
import type { DocumentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import type { NetworkRepository } from "@/lib/repositories/network/network.repository";
import { networkRepository } from "@/lib/repositories/network/network.repository.impl";
import type { InsightsRepository } from "@/lib/repositories/insights/insights.repository";
import { insightsRepository } from "@/lib/repositories/insights/insights.repository.impl";
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
import type { BillingRepository } from "@/lib/repositories/billing/billing.repository";
import { billingRepository } from "@/lib/repositories/billing/billing.repository.impl";
import type { BranchesRepository } from "@/lib/repositories/branches/branches.repository";
import { branchesRepository } from "@/lib/repositories/branches/branches.repository.impl";
import type { ProductsRepository } from "@/lib/repositories/products/products.repository";
import { productsRepository } from "@/lib/repositories/products/products.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { BillingService } from "@/lib/services/billing/billing.service";
import { BranchesService } from "@/lib/services/branches/branches.service";
import { NetworkService } from "@/lib/services/network/network.service";
import { InsightsService } from "@/lib/services/insights/insights.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { ProductCategoriesService } from "@/lib/services/product-categories/product-categories.service";
import { ProductsService } from "@/lib/services/products/products.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StaffService } from "@/lib/services/staff/staff.service";
import { PharmacySearchService } from "@/lib/services/pharmacy-search/pharmacy-search.service";
import { StockService } from "@/lib/services/stock/stock.service";
import type { AppServices } from "@/lib/di/services";

/** Builds services with optional repository overrides; uses production impl singletons for the rest (requires env e.g. DATABASE_URL when loaded). */
export type TestServiceOverrides = Partial<{
  auth: AuthRepository;
  billing: BillingRepository;
  branches: BranchesRepository;
  avatarStorage: AvatarStorageRepository;
  stock: StockRepository;
  sales: SalesRepository;
  onboarding: OnboardingRepository;
  documentStorage: DocumentStorageRepository;
  staff: StaffRepository;
  network: NetworkRepository;
  insights: InsightsRepository;
  pharmacySearch: PharmacySearchRepository;
  productCategories: ProductCategoriesRepository;
  products: ProductsRepository;
}>;

export function createTestServices(overrides: TestServiceOverrides = {}): AppServices {
  const auth = overrides.auth ?? authRepository;
  const billing = overrides.billing ?? billingRepository;
  const branches = overrides.branches ?? branchesRepository;
  const avatarStorage = overrides.avatarStorage ?? avatarStorageRepository;
  const stock = overrides.stock ?? stockRepository;
  const sales = overrides.sales ?? salesRepository;
  const onboarding = overrides.onboarding ?? onboardingRepository;
  const documentStorage = overrides.documentStorage ?? documentStorageRepository;
  const staff = overrides.staff ?? staffRepository;
  const network = overrides.network ?? networkRepository;
  const insights = overrides.insights ?? insightsRepository;
  const pharmacySearch = overrides.pharmacySearch ?? pharmacySearchRepository;
  const productCategories = overrides.productCategories ?? productCategoriesRepository;
  const products = overrides.products ?? productsRepository;

  return {
    auth: new AuthService({ auth, avatarStorage }),
    billing: new BillingService({ billing }),
    branches: new BranchesService({ branches }),
    stock: new StockService({ stock }),
    sales: new SalesService({ sales }),
    onboarding: new OnboardingService({ onboarding, documentStorage }),
    staff: new StaffService({ staff, documentStorage }),
    network: new NetworkService({ network }),
    insights: new InsightsService({ insights }),
    pharmacySearch: new PharmacySearchService({ pharmacySearch }),
    productCategories: new ProductCategoriesService({ productCategories }),
    products: new ProductsService({ products }),
  };
}
