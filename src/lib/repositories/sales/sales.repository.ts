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
    totalExpensesCents: number;
    previousExpensesCents: number;
    totalRestockingCents: number;
    previousRestockingCents: number;
    totalChargeExpensesCents: number;
    previousChargeExpensesCents: number;
    grossProfitBeforeExpensesCents: number;
    previousGrossProfitBeforeExpensesCents: number;
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

export type SalesDetailData = {
  id: string;
  saleNumber: string;
  status: string;
  paymentStatus: string;
  patientName: string | null;
  branchName: string;
  servedByName: string | null;
  createdAt: string;
  completedAt: string | null;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  items: Array<{
    id: string;
    productName: string;
    description: string;
    batchNumber: string | null;
    quantity: number;
    unitPriceCents: number;
    lineSubtotalCents: number;
    lineTotalCents: number;
  }>;
  payments: Array<{
    id: string;
    method: string;
    status: string;
    reference: string | null;
    amountCents: number;
    paidAt: string | null;
  }>;
};

export type SalesSoldItemsData = {
  branch: SalesBranchContext;
  branches: SalesBranchOption[];
  items: Array<{
    id: string;
    saleId: string;
    saleNumber: string;
    soldAt: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    paymentMethod: string | null;
    customerName: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type DeleteSaleResult = {
  id: string;
  saleNumber: string;
  restoredItemCount: number;
};

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
  getSaleById(context: AuthContext, saleId: string): Promise<SalesDetailData | null>;
  getSoldItems(
    context: AuthContext,
    options?: { branchId?: string; range?: SalesDateRange; page?: number; pageSize?: number },
  ): Promise<SalesSoldItemsData>;
  getCatalog(context: AuthContext, branchId?: string, q?: string): Promise<SalesCatalogData>;
  createSale(context: AuthContext, input: CreateSaleInput): Promise<CreateSaleResult>;
  deleteSale(context: AuthContext, saleId: string): Promise<DeleteSaleResult>;
}
