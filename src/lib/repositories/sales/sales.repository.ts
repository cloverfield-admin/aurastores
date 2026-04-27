import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { CreateSaleInput } from "@/lib/validation/sales";

type SalesBranchContext = {
  id: string;
  name: string;
};

type SalesBranchOption = SalesBranchContext & {
  isPrimary: boolean;
};

export type SalesDashboardData = {
  branch: SalesBranchContext;
  branches: SalesBranchOption[];
  metrics: {
    totalRevenueCents: number;
    previousRevenueCents: number;
    totalCogsCents: number;
    previousCogsCents: number;
    totalChargeExpensesCents: number;
    previousChargeExpensesCents: number;
    grossProfitBeforeChargesCents: number;
    previousGrossProfitBeforeChargesCents: number;
    grossProfitCents: number;
    previousGrossProfitCents: number;
    totalSalesCount: number;
    averageOrderValueCents: number;
    unitsSoldLast30Days: number;
    previousUnitsSoldLast30Days: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    amountCents: number;
    pct: number;
  }>;
  branchDistribution: Array<{
    branchId: string;
    name: string;
    amountCents: number;
    pct: number;
  }>;
  trend: Array<{
    label: string;
    revenueCents: number;
    unitsSold: number;
  }>;
};

export type SalesRecentSalesData = Array<{
  id: string;
  saleNumber: string;
  patientName: string | null;
  createdAt: string;
  totalCents: number;
}>;

export type SalesDateRange = {
  start: Date;
  end: Date;
};

export type SalesCatalogData = {
  branch: SalesBranchContext;
  branches: SalesBranchOption[];
  products: Array<{
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    categoryName: string;
    defaultSellingPriceCents: number;
    batches: Array<{
      id: string;
      batchNumber: string;
      expiresAt: string;
      quantityAvailable: number;
    }>;
  }>;
};

export type CreateSaleResult = {
  id: string;
  saleNumber: string;
  status: string;
  totalCents: number;
};

export interface SalesRepository {
  getDashboard(context: AuthContext, branchId?: string, range?: SalesDateRange): Promise<SalesDashboardData>;
  getRecentSales(context: AuthContext, branchId?: string): Promise<SalesRecentSalesData>;
  getCatalog(context: AuthContext, branchId?: string, q?: string): Promise<SalesCatalogData>;
  createSale(context: AuthContext, input: CreateSaleInput): Promise<CreateSaleResult>;
}
