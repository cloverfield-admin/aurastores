import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type ExpensesDateRange = {
  start: Date;
  end: Date;
};

export type ExpenseType = "general" | "restocking" | "charge";
export type ExpenseChargeType = "momo_sale_fee" | "wallet_withdrawal_fee";

export type ExpensesDashboardInput = {
  branchId?: string;
  range?: ExpensesDateRange;
  type?: ExpenseType;
  page?: number;
  pageSize?: number;
};

export type ExpensesDashboardData = {
  branch: {
    id: string;
    name: string;
  };
  branches: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>;
  totals: {
    totalCents: number;
    byType: Record<ExpenseType, number>;
  };
  series: Array<{
    date: string; // YYYY-MM-DD
    totalCents: number;
    generalCents: number;
    restockingCents: number;
    chargeCents: number;
  }>;
  expenses: Array<{
    id: string;
    expenseType: ExpenseType;
    chargeType: ExpenseChargeType | null;
    amountCents: number;
    currency: string;
    description: string;
    expenseDate: string;
    sourceRef: string | null;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type CreateExpenseInput = {
  branchId?: string;
  expenseType: "general" | "restocking";
  amountCents: number;
  currency?: string;
  description: string;
  expenseDate: Date;
};

export interface ExpensesRepository {
  getDashboard(context: AuthContext, input: ExpensesDashboardInput): Promise<ExpensesDashboardData>;
  createExpense(context: AuthContext, input: CreateExpenseInput): Promise<{ id: string }>;
  deleteExpense(context: AuthContext, expenseId: string): Promise<void>;
}

