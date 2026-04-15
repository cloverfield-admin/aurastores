import type { BillingRepository } from "@/lib/repositories/billing/billing.repository";

export class BillingService {
  constructor(
    private readonly repos: {
      billing: BillingRepository;
    },
  ) {}

  listPublicPlans(currency: string) {
    return this.repos.billing.listPublicPlans(currency);
  }

  getOrgSubscription(organizationId: string) {
    return this.repos.billing.getOrgSubscription(organizationId);
  }

  createInvoice(params: Parameters<BillingRepository["createInvoice"]>[0]) {
    return this.repos.billing.createInvoice(params);
  }

  findInvoiceByIdentifier(identifier: string) {
    return this.repos.billing.findInvoiceByIdentifier(identifier);
  }

  recordLipilaCallback(invoiceId: string, payload: Parameters<BillingRepository["recordLipilaCallback"]>[1]) {
    return this.repos.billing.recordLipilaCallback(invoiceId, payload);
  }

  recordLipilaInitiation(invoiceId: string, params: Parameters<BillingRepository["recordLipilaInitiation"]>[1]) {
    return this.repos.billing.recordLipilaInitiation(invoiceId, params);
  }

  markInvoicePaid(invoiceId: string, paidAt: Date) {
    return this.repos.billing.markInvoicePaid(invoiceId, paidAt);
  }

  activateOrgPlanFromInvoice(invoiceId: string) {
    return this.repos.billing.activateOrgPlanFromInvoice(invoiceId);
  }
}

