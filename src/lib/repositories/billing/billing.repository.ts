import type {
  lipilaTransactions,
  subscriptionInvoiceStatusEnum,
  subscriptionInvoices,
  subscriptionPlanFeatures,
} from "@/lib/db/schema";

export type SubscriptionInterval = "monthly" | "quarterly" | "yearly";
export type SubscriptionPlanCode = "free" | "basic" | "pro" | "enterprise";
export type OrganizationSubscriptionStatus = "active" | "past_due" | "canceled" | "pending_payment";
export type SubscriptionInvoiceStatus = (typeof subscriptionInvoiceStatusEnum.enumValues)[number];

export type PublicPlan = {
  code: SubscriptionPlanCode;
  name: string;
  sortOrder: number;
  features: typeof subscriptionPlanFeatures.$inferSelect["features"];
  prices: Partial<Record<SubscriptionInterval, { amountCents: number; currency: string }>>;
};

export type OrgSubscriptionSnapshot = {
  planCode: SubscriptionPlanCode;
  planName: string;
  interval: SubscriptionInterval;
  status: OrganizationSubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  scheduledPlanCode: SubscriptionPlanCode | null;
};

export type CreateInvoiceParams = {
  organizationId: string;
  planCode: SubscriptionPlanCode;
  interval: SubscriptionInterval;
};

export type Invoice = typeof subscriptionInvoices.$inferSelect;
export type LipilaTransaction = typeof lipilaTransactions.$inferSelect;

export type LipilaCallbackPayload = {
  referenceId?: string;
  currency?: string;
  amount?: number;
  accountNumber?: string;
  status?: string;
  paymentType?: string;
  type?: string;
  ipAddress?: string;
  identifier?: string;
  message?: string;
  externalId?: string;
};

export type RecordLipilaInitiationParams = {
  identifier: string;
  referenceId?: string | null;
  externalId?: string | null;
  message?: string | null;
  rawPayload: unknown;
};

export interface BillingRepository {
  listPublicPlans(currency: string): Promise<PublicPlan[]>;
  getOrgSubscription(organizationId: string): Promise<OrgSubscriptionSnapshot | null>;
  createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
  findInvoiceByIdentifier(identifier: string): Promise<Invoice | null>;
  recordLipilaInitiation(invoiceId: string, params: RecordLipilaInitiationParams): Promise<LipilaTransaction>;
  recordLipilaCallback(invoiceId: string, payload: LipilaCallbackPayload): Promise<LipilaTransaction>;
  markInvoicePaid(invoiceId: string, paidAt: Date): Promise<void>;
  activateOrgPlanFromInvoice(invoiceId: string): Promise<void>;
}

