import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type NetworkBranchSummary = {
  id: string;
  name: string;
  isPrimary: boolean;
  branchStatus: string;
  revenueCents30d: number;
  cogsCents30d: number;
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
    totalGrossProfitCents30d: number;
    totalLowStockSkuCount: number;
    healthyBatchRatioAvg: number;
    activeStaffCount: number;
    totalStaffCount: number;
  };
  branches: NetworkBranchSummary[];
  staffPreviewNames: string[];
};

export interface NetworkRepository {
  getDashboard(context: AuthContext): Promise<NetworkDashboardData>;
}
