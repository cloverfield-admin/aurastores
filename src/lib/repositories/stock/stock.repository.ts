import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { CreateStockBatchInput, StockAdjustmentInput } from "@/lib/validation/stock";

type StockBranchContext = {
  id: string;
  name: string;
};

type StockBranchOption = StockBranchContext & {
  isPrimary: boolean;
};

export type StockDashboardData = {
  branch: StockBranchContext;
  branches: StockBranchOption[];
  lastSyncedAt: string;
  filters: {
    search: string;
    view: "all" | "expiring";
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  metrics: {
    totalStockValueCents: number;
    totalAvailableUnits: number;
    totalBatchCount: number;
    nearExpiryBatchCount: number;
    expiredBatchCount: number;
    outOfStockSkuCount: number;
    lowStockSkuCount: number;
    reorderSuggestedCount: number;
    stockTurnoverRate: number;
    healthyBatchRatio: number;
    unitsSoldLast30Days: number;
  };
  inventory: Array<{
    id: string;
    productName: string;
    sku: string;
    categoryName: string;
    supplierName: string | null;
    batchNumber: string;
    expiresAt: string;
    daysToExpiry: number;
    quantityAvailable: number;
    quantityReceived: number;
    stockProgressPercent: number;
    unitCostCents: number;
    unitSalePriceCents: number | null;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
    canDispose: boolean;
  }>;
  recentEntries: Array<{
    id: string;
    productName: string;
    batchNumber: string;
    quantityReceived: number;
    createdAt: string;
  }>;
  draftOrder: {
    branchName: string;
    productCount: number;
    products: string[];
  };
};

export type StockCatalogData = {
  branch: StockBranchContext;
  branches: StockBranchOption[];
  suppliers: Array<{
    id: string;
    name: string;
  }>;
  products: Array<{
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    defaultSellingPriceCents: number;
  }>;
  recentEntries: StockDashboardData["recentEntries"];
};

export type StockGetDashboardOptions = {
  branchId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  view?: "all" | "expiring";
};

export type StockGetCatalogOptions = {
  branchId?: string;
};

export type StockBatchDetail = {
  id: string;
  batchNumber: string;
  purchaseOrderNumber: string | null;
  productName: string;
  sku: string;
  categoryName: string;
  supplierName: string | null;
  branchId: string;
  branchName: string;
  receivedAt: string;
  manufacturedAt: string | null;
  expiresAt: string;
  quantityReceived: number;
  quantityAvailable: number;
  unitCostCents: number;
  unitSalePriceCents: number | null;
  status: string;
  notes: string | null;
  daysToExpiry: number;
  stockProgressPercent: number;
  canDispose: boolean;
  transactions: Array<{
    id: string;
    occurredAt: string;
    transactionType: string;
    quantityDelta: number;
    performedByName: string | null;
    referenceType: string | null;
    referenceId: string | null;
    note: string | null;
  }>;
};

export type StockAdjustBatchesResult = {
  adjustedCount: number;
  batchIds: string[];
  productNames: string[];
  updatedBatches: Array<{
    id: string;
    quantityAvailable: number;
    status: "active" | "expiring_soon" | "expired" | "disposed" | "depleted";
  }>;
};

export interface StockRepository {
  getDashboard(
    context: AuthContext,
    options?: StockGetDashboardOptions,
  ): Promise<StockDashboardData>;
  getCatalog(context: AuthContext, options?: StockGetCatalogOptions): Promise<StockCatalogData>;
  getBranches(
    context: AuthContext,
    preferredBranchId?: string,
  ): Promise<{
    branch: { id: string; name: string };
    branches: Array<{ id: string; name: string; isPrimary: boolean }>;
  }>;
  createBatch(
    context: AuthContext,
    input: CreateStockBatchInput,
  ): Promise<{ id: string; batchNumber: string; productName: string }>;
  getBatchById(context: AuthContext, batchId: string): Promise<StockBatchDetail | null>;
  disposeBatch(
    context: AuthContext,
    batchId: string,
    note?: string,
    branchId?: string,
  ): Promise<{ id: string; batchNumber: string; productName: string }>;
  restoreDisposedBatch(
    context: AuthContext,
    batchId: string,
    note?: string,
    branchId?: string,
  ): Promise<{ id: string; batchNumber: string; productName: string; restoredQuantity: number }>;
  adjustBatches(context: AuthContext, input: StockAdjustmentInput): Promise<StockAdjustBatchesResult>;
}
