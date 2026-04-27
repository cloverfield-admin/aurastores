import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

export type PayDateRange = {
  start: Date;
  end: Date;
};

export type PayPaymentMethod =
  | "aura_pay_wallet"
  | "card"
  | "mobile_money"
  | "cash"
  | "insurance"
  | "bank_transfer";

export type PayBranchOption = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type PayWalletData = {
  id: string;
  branchId: string;
  currency: string;
  balanceCents: number;
  status: "active" | "suspended";
  createdAt: string;
  updatedAt: string;
} | null;

export type PayDashboardInput = {
  branchId?: string;
  range?: PayDateRange;
  method?: PayPaymentMethod;
  page?: number;
  pageSize?: number;
};

export type PayDashboardData = {
  branch: {
    id: string;
    name: string;
  };
  branches: PayBranchOption[];
  wallet: PayWalletData;
  balance: {
    availableCents: number;
    pendingWithdrawalsCents: number;
    lifetimeSettlementsCents: number;
  };
  metrics: {
    totalAmountCents: number;
    totalCount: number;
    averageTransactionCents: number;
    byMethod: Array<{
      method: PayPaymentMethod;
      count: number;
      amountCents: number;
    }>;
  };
  transactions: Array<{
    id: string;
    saleId: string;
    saleNumber: string;
    patientName: string | null;
    method: PayPaymentMethod;
    status: string;
    reference: string | null;
    amountCents: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
    itemCount: number;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type PayTransactionDetailData = {
  payment: {
    id: string;
    saleId: string;
    saleNumber: string;
    method: PayPaymentMethod;
    status: string;
    reference: string | null;
    amountCents: number;
    currency: string;
    paidAt: string | null;
    createdAt: string;
  };
  sale: {
    id: string;
    saleNumber: string;
    patientName: string | null;
    patientPhone: string | null;
    servedByName: string | null;
    subtotalCents: number;
    taxCents: number;
    discountCents: number;
    totalCents: number;
    completedAt: string | null;
    createdAt: string;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    productName: string | null;
  }>;
};

export type ActivateWalletInput = {
  branchId?: string;
};

export type WithdrawWalletInput = {
  branchId?: string;
  amountCents: number;
  mobileNumber: string;
  reference?: string;
};

export interface PayRepository {
  getDashboard(context: AuthContext, input: PayDashboardInput): Promise<PayDashboardData>;
  activateWallet(context: AuthContext, input: ActivateWalletInput): Promise<NonNullable<PayWalletData>>;
  withdraw(context: AuthContext, input: WithdrawWalletInput): Promise<NonNullable<PayWalletData>>;
  getTransactionDetail(context: AuthContext, paymentId: string): Promise<PayTransactionDetailData | null>;
}
