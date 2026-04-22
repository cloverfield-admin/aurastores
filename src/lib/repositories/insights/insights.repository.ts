import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type InsightsTrendPoint = {
  /** ISO date (UTC) e.g. 2026-04-22 */
  date: string;
  revenueCents: number;
  unitsSold: number;
  salesCount: number;
};

export type InsightsInventoryHealthPoint = {
  date: string;
  nearExpiryBatchCount: number;
  lowStockSkuCount: number;
  healthyBatchRatio: number;
};

export type InsightsOperationsPoint = {
  date: string;
  salesCount: number;
  activeStaffCount: number;
};

export type InsightsDispensingSnapshot = {
  topMedications: Array<{ name: string; unitsSold: number }>;
  topCategories: Array<{ name: string; unitsSold: number }>;
};

export type InsightsHeatmapDimension = "lowStock" | "nearExpiry" | "batchHealthRisk";

export type InsightsHeatmapCell = {
  dimension: InsightsHeatmapDimension;
  /** Raw value (count or risk score). */
  value: number;
  /** Normalized intensity 0-100 for UI rendering. */
  intensity: number;
};

export type InsightsHeatmapRow = {
  branchId: string;
  branchName: string;
  cells: InsightsHeatmapCell[];
};

export type InsightsOverviewData = {
  scope: { branchId?: string };
  kpis: {
    revenueCents30d: number;
    unitsSold30d: number;
    salesCount30d: number;
    nearExpiryBatchCount: number;
    lowStockSkuCount: number;
    activeStaffCount: number;
  };
  forecast: {
    /** Default assumptions used for reorder math. */
    assumptions: {
      windowDays: number;
      targetCoverDays: number;
      reorderWhenBelowDaysCover: number;
    };
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      categoryName: string;
      unitsSoldWindow: number;
      avgDailyUnits: number;
      availableUnits: number;
      daysOfCover: number | null;
      suggestedOrderUnits: number;
      estimatedUnitPriceCents: number;
      estimatedOrderValueCents: number;
    }>;
  };
  riskToRevenue: {
    nearExpiry: {
      batchesAtRisk: number;
      unitsAtRisk: number;
      costValueCents: number;
      estimatedRetailValueCents: number;
    };
    lowStock: {
      skusAtRisk: number;
      estimatedLostUnitsNext30d: number;
      estimatedLostRevenueCentsNext30d: number;
    };
  };
  trends: {
    sales: InsightsTrendPoint[];
    inventoryHealth: InsightsInventoryHealthPoint[];
    operations: InsightsOperationsPoint[];
  };
  dispensing: InsightsDispensingSnapshot;
  geo: {
    branches: Array<{
      branchId: string;
      branchName: string;
      latitude: number | null;
      longitude: number | null;
      riskScore: number;
      riskLabel: "low" | "medium" | "high";
    }>;
  };
  heatmap: {
    dimensions: InsightsHeatmapDimension[];
    rows: InsightsHeatmapRow[];
  };
};

export interface InsightsRepository {
  getOverview(context: AuthContext, options?: { branchId?: string }): Promise<InsightsOverviewData>;
}

