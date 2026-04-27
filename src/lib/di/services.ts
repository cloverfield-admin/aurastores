import { authRepository } from "@/lib/repositories/auth/auth.repository.impl";
import { billingRepository } from "@/lib/repositories/billing/billing.repository.impl";
import { avatarStorageRepository } from "@/lib/repositories/avatar-storage/avatar-storage.repository.impl";
import { branchesRepository } from "@/lib/repositories/branches/branches.repository.impl";
import { documentStorageRepository } from "@/lib/repositories/document-storage/document-storage.repository.impl";
import { networkRepository } from "@/lib/repositories/network/network.repository.impl";
import { insightsRepository } from "@/lib/repositories/insights/insights.repository.impl";
import { pharmacySearchRepository } from "@/lib/repositories/pharmacy-search/pharmacy-search.repository.impl";
import { onboardingRepository } from "@/lib/repositories/onboarding/onboarding.repository.impl";
import { payRepository } from "@/lib/repositories/pay/pay.repository.impl";
import { expensesRepository } from "@/lib/repositories/expenses/expenses.repository.impl";
import { productCategoriesRepository } from "@/lib/repositories/product-categories/product-categories.repository.impl";
import { productsRepository } from "@/lib/repositories/products/products.repository.impl";
import { salesRepository } from "@/lib/repositories/sales/sales.repository.impl";
import { staffRepository } from "@/lib/repositories/staff/staff.repository.impl";
import { stockRepository } from "@/lib/repositories/stock/stock.repository.impl";
import { AuthService } from "@/lib/services/auth/auth.service";
import { BillingService } from "@/lib/services/billing/billing.service";
import { BranchesService } from "@/lib/services/branches/branches.service";
import { NetworkService } from "@/lib/services/network/network.service";
import { InsightsService } from "@/lib/services/insights/insights.service";
import { PharmacySearchService } from "@/lib/services/pharmacy-search/pharmacy-search.service";
import { OnboardingService } from "@/lib/services/onboarding/onboarding.service";
import { PayService } from "@/lib/services/pay/pay.service";
import { ExpensesService } from "@/lib/services/expenses/expenses.service";
import { ProductCategoriesService } from "@/lib/services/product-categories/product-categories.service";
import { ProductsService } from "@/lib/services/products/products.service";
import { SalesService } from "@/lib/services/sales/sales.service";
import { StaffService } from "@/lib/services/staff/staff.service";
import { StockService } from "@/lib/services/stock/stock.service";

export type AppServices = {
  auth: AuthService;
  billing: BillingService;
  branches: BranchesService;
  stock: StockService;
  sales: SalesService;
  onboarding: OnboardingService;
  staff: StaffService;
  network: NetworkService;
  insights: InsightsService;
  pay: PayService;
  expenses: ExpensesService;
  pharmacySearch: PharmacySearchService;
  productCategories: ProductCategoriesService;
  products: ProductsService;
};

export const services: AppServices = {
  auth: new AuthService({ auth: authRepository, avatarStorage: avatarStorageRepository }),
  billing: new BillingService({ billing: billingRepository }),
  branches: new BranchesService({ branches: branchesRepository }),
  stock: new StockService({ stock: stockRepository }),
  sales: new SalesService({ sales: salesRepository }),
  onboarding: new OnboardingService({
    onboarding: onboardingRepository,
    documentStorage: documentStorageRepository,
  }),
  staff: new StaffService({ staff: staffRepository, documentStorage: documentStorageRepository }),
  network: new NetworkService({ network: networkRepository }),
  insights: new InsightsService({ insights: insightsRepository }),
  pay: new PayService({ pay: payRepository }),
  expenses: new ExpensesService({ expenses: expensesRepository }),
  pharmacySearch: new PharmacySearchService({ pharmacySearch: pharmacySearchRepository }),
  productCategories: new ProductCategoriesService({ productCategories: productCategoriesRepository }),
  products: new ProductsService({ products: productsRepository }),
};
