import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type NetworkBranchSummary = {
  id: string;
  name: string;
  isPrimary: boolean;
  branchStatus: string;
  revenueCents30d: number;
  cogsCents30d: number;
  expensesCents30d: number;
  chargeExpensesCents30d: number;
  grossProfitCents30d: number;
  lowStockSkuCount: number;
  healthyBatchRatio: number;
  unitsSold30d: number;
  leadPharmacistName: string | null;
};

export type NetworkDashboardData = {
  totals: {
    totalRevenueCents30d: number;
    previousRevenueCents30d: number;
    totalCogsCents30d: number;
    totalExpensesCents30d: number;
    totalChargeExpensesCents30d: number;
    totalGrossProfitCents30d: number;
    totalLowStockSkuCount: number;
    healthyBatchRatioAvg: number;
    activeStaffCount: number;
    totalStaffCount: number;
  };
  branches: NetworkBranchSummary[];
  staffPreviewNames: string[];
};

/** Lightweight branch row for organization overview (no metrics; RBAC-scoped). */
export type OrganizationBranchOverview = {
  id: string;
  name: string;
  isPrimary: boolean;
  status: string;
  leadPharmacistName: string | null;
};

export type OrganizationBranchesData = {
  branches: OrganizationBranchOverview[];
  salesTax: { enabled: boolean; rateBps: number };
};

export interface NetworkRepository {
  getDashboard(context: AuthContext): Promise<NetworkDashboardData>;
  getOrganizationBranches(context: AuthContext): Promise<OrganizationBranchesData>;
}
