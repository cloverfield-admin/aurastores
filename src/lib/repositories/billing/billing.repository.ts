import type {
  lipilaTransactions,
  subscriptionInvoiceStatusEnum,
  subscriptionInvoices,
  subscriptionPlanFeatures,
} from "@/lib/db/schema";

export type SubscriptionInterval = "monthly" | "quarterly" | "yearly";
export type SubscriptionPlanCode = "free" | "basic" | "pro" | "enterprise";
export type OrganizationSubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "pending_payment"
  | "trialing";
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
  /** True when the org may start its one-time paid-plan intro trial (free plan, never started intro trial). */
  introPaidTrialEligible: boolean;
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
  ensureIntroTrialReconciled(organizationId: string): Promise<void>;
  getOrgSubscription(organizationId: string): Promise<OrgSubscriptionSnapshot | null>;
  grantIntroTrialAfterOnboardingIfEligible(organizationId: string): Promise<boolean>;
  startIntroPaidTrial(params: { organizationId: string; planCode: SubscriptionPlanCode }): Promise<void>;
  createInvoice(params: CreateInvoiceParams): Promise<Invoice>;
  findInvoiceByIdentifier(identifier: string): Promise<Invoice | null>;
  recordLipilaInitiation(invoiceId: string, params: RecordLipilaInitiationParams): Promise<LipilaTransaction>;
  recordLipilaCallback(invoiceId: string, payload: LipilaCallbackPayload): Promise<LipilaTransaction>;
  markInvoicePaid(invoiceId: string, paidAt: Date): Promise<void>;
  activateOrgPlanFromInvoice(invoiceId: string): Promise<void>;
}

