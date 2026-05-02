import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { introPaidTrialEligibleForSnapshot, introTrialPeriodEnd, normalizeSignupSelectedPlanCode } from "@/lib/billing/intro-trial";
import { withPublicPlanSalesLimitFallback } from "@/lib/billing/plan-feature-defaults";
import { db } from "@/lib/db";
import {
  lipilaTransactions,
  organizations,
  organizationSubscriptions,
  subscriptionInvoices,
  subscriptionPlanFeatures,
  subscriptionPlanPrices,
  subscriptionPlans,
} from "@/lib/db/schema";
import type {
  BillingRepository,
  CreateInvoiceParams,
  LipilaCallbackPayload,
  OrganizationSubscriptionStatus,
  OrgSubscriptionSnapshot,
  PublicPlan,
  RecordLipilaInitiationParams,
  SubscriptionInterval,
  SubscriptionPlanCode,
} from "@/lib/repositories/billing/billing.repository";

function buildIdentifier(prefix: string) {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${now}_${rand}`;
}

function normalizePlanCode(code: string): SubscriptionPlanCode {
  if (code === "free" || code === "basic" || code === "pro" || code === "enterprise") {
    return code;
  }
  return "free";
}

function normalizeInterval(interval: string): SubscriptionInterval {
  if (interval === "monthly" || interval === "quarterly" || interval === "yearly") {
    return interval;
  }
  return "monthly";
}

function normalizeSubscriptionStatus(status: string): OrganizationSubscriptionStatus {
  if (
    status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "pending_payment" ||
    status === "trialing"
  ) {
    return status;
  }
  return "active";
}

function addMonthsClamped(date: Date, months: number): Date {
  // Keep "end of month" behavior predictable:
  // If the target month has fewer days, clamp to the last day of that month.
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const targetMonthIndex = month + months;
  const firstOfTarget = new Date(Date.UTC(year, targetMonthIndex, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const lastDayOfTargetMonth = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      firstOfTarget.getUTCFullYear(),
      firstOfTarget.getUTCMonth(),
      clampedDay,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

function computePeriodEnd(start: Date, interval: SubscriptionInterval): Date {
  if (interval === "monthly") return addMonthsClamped(start, 1);
  if (interval === "quarterly") return addMonthsClamped(start, 3);
  return addMonthsClamped(start, 12);
}

function isUuidLike(value: string): boolean {
  // Accept canonical UUID forms; Lipila collections referenceId may be non-UUID.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Postgres `unique_violation` (e.g. duplicate `reference_id_text`). */
function isPostgresUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const code = (current as { code?: string }).code;
    if (code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export class BillingRepositoryImpl implements BillingRepository {
  async listPublicPlans(currency: string): Promise<PublicPlan[]> {
    const plans = await db
      .select({
        planId: subscriptionPlans.id,
        code: subscriptionPlans.code,
        name: subscriptionPlans.name,
        sortOrder: subscriptionPlans.sortOrder,
        features: subscriptionPlanFeatures.features,
      })
      .from(subscriptionPlans)
      .innerJoin(subscriptionPlanFeatures, eq(subscriptionPlanFeatures.planId, subscriptionPlans.id))
      .where(eq(subscriptionPlans.isPublic, true))
      .orderBy(subscriptionPlans.sortOrder);

    const planIds = plans.map((p) => p.planId);
    const prices =
      planIds.length === 0
        ? []
        : await db
            .select({
              planId: subscriptionPlanPrices.planId,
              interval: subscriptionPlanPrices.interval,
              amountCents: subscriptionPlanPrices.amountCents,
              currency: subscriptionPlanPrices.currency,
            })
            .from(subscriptionPlanPrices)
            .where(
              and(
                inArray(subscriptionPlanPrices.planId, planIds),
                eq(subscriptionPlanPrices.currency, currency),
                eq(subscriptionPlanPrices.isActive, true),
                sql`${subscriptionPlanPrices.effectiveFrom} <= now()`,
                isNull(subscriptionPlanPrices.effectiveTo),
              ),
            );

    const pricesByPlan = new Map<string, PublicPlan["prices"]>();
    for (const row of prices) {
      const existing = pricesByPlan.get(row.planId) ?? {};
      existing[row.interval] = { amountCents: row.amountCents, currency: row.currency };
      pricesByPlan.set(row.planId, existing);
    }

    return plans.map((p): PublicPlan => {
      const code = normalizePlanCode(p.code);
      return {
        code,
        name: p.name,
        sortOrder: p.sortOrder,
        features: withPublicPlanSalesLimitFallback(code, p.features),
        prices: pricesByPlan.get(p.planId) ?? {},
      };
    });
  }

  async ensureIntroTrialReconciled(organizationId: string): Promise<void> {
    const sub = await db.query.organizationSubscriptions.findFirst({
      where: eq(organizationSubscriptions.organizationId, organizationId),
    });
    if (!sub || sub.status !== "trialing") {
      return;
    }
    const end = sub.currentPeriodEnd;
    if (!end || end.getTime() > Date.now()) {
      return;
    }

    const freePlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, "free"),
    });
    if (!freePlan) {
      return;
    }

    const now = new Date();
    await db
      .update(organizationSubscriptions)
      .set({
        planId: freePlan.id,
        status: "active",
        interval: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: null,
        scheduledPlanId: null,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })
      .where(eq(organizationSubscriptions.organizationId, organizationId));
  }

  async getOrgSubscription(organizationId: string): Promise<OrgSubscriptionSnapshot | null> {
    await this.ensureIntroTrialReconciled(organizationId);

    const orgRow = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      columns: { paidIntroTrialStartedAt: true },
    });

    const row = await db
      .select({
        planCode: subscriptionPlans.code,
        planName: subscriptionPlans.name,
        interval: organizationSubscriptions.interval,
        status: organizationSubscriptions.status,
        currentPeriodStart: organizationSubscriptions.currentPeriodStart,
        currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: organizationSubscriptions.cancelAtPeriodEnd,
        scheduledPlanId: organizationSubscriptions.scheduledPlanId,
      })
      .from(organizationSubscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, organizationSubscriptions.planId))
      .where(eq(organizationSubscriptions.organizationId, organizationId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!row) return null;

    const scheduledPlanId =
      typeof row.scheduledPlanId === "string" && row.scheduledPlanId.trim().length > 0
        ? row.scheduledPlanId
        : null;
    const scheduled = scheduledPlanId
      ? await db.query.subscriptionPlans.findFirst({ where: eq(subscriptionPlans.id, scheduledPlanId) })
      : null;

    const planCode = normalizePlanCode(row.planCode);
    const status = normalizeSubscriptionStatus(row.status);

    return {
      planCode,
      planName: row.planName,
      interval: normalizeInterval(row.interval),
      status,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      scheduledPlanCode: scheduled?.code ? normalizePlanCode(scheduled.code) : null,
      introPaidTrialEligible: introPaidTrialEligibleForSnapshot({
        paidIntroTrialStartedAt: orgRow?.paidIntroTrialStartedAt ?? null,
        planCode,
        status,
      }),
    };
  }

  async grantIntroTrialAfterOnboardingIfEligible(organizationId: string): Promise<boolean> {
    await this.ensureIntroTrialReconciled(organizationId);

    return db.transaction(async (tx) => {
      const org = await tx.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });
      if (!org || org.paidIntroTrialStartedAt) {
        return false;
      }

      const stored = normalizeSignupSelectedPlanCode(org.signupSelectedPlanCode ?? undefined);
      if (!stored) {
        return false;
      }

      const paidPlan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.code, stored),
      });
      if (!paidPlan) {
        return false;
      }

      const now = new Date();
      const trialEnd = introTrialPeriodEnd(now);

      await tx
        .update(organizations)
        .set({
          paidIntroTrialStartedAt: now,
          signupSelectedPlanCode: null,
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId));

      await tx
        .update(organizationSubscriptions)
        .set({
          planId: paidPlan.id,
          status: "trialing",
          interval: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          scheduledPlanId: null,
          cancelAtPeriodEnd: false,
          updatedAt: now,
        })
        .where(eq(organizationSubscriptions.organizationId, organizationId));

      return true;
    });
  }

  async startIntroPaidTrial(params: { organizationId: string; planCode: SubscriptionPlanCode }): Promise<void> {
    await this.ensureIntroTrialReconciled(params.organizationId);

    const { organizationId, planCode } = params;
    if (planCode === "free") {
      throw new Error("Intro trial is only for paid plans.");
    }

    await db.transaction(async (tx) => {
      const org = await tx.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });
      if (!org) {
        throw new Error("Organization not found.");
      }
      if (org.paidIntroTrialStartedAt) {
        throw new Error("Intro trial has already been used for this organization.");
      }

      const subRow = await tx
        .select({
          planCode: subscriptionPlans.code,
          status: organizationSubscriptions.status,
        })
        .from(organizationSubscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, organizationSubscriptions.planId))
        .where(eq(organizationSubscriptions.organizationId, organizationId))
        .limit(1)
        .then((rows) => rows[0] ?? null);

      if (!subRow) {
        throw new Error("Subscription not found.");
      }
      if (normalizePlanCode(subRow.planCode) !== "free" || subRow.status !== "active") {
        throw new Error("Intro trial is only available on an active Free plan.");
      }

      const paidPlan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.code, planCode),
      });
      if (!paidPlan) {
        throw new Error("Plan not found.");
      }

      const now = new Date();
      const trialEnd = introTrialPeriodEnd(now);

      await tx
        .update(organizations)
        .set({
          paidIntroTrialStartedAt: now,
          signupSelectedPlanCode: null,
          updatedAt: now,
        })
        .where(eq(organizations.id, organizationId));

      await tx
        .update(organizationSubscriptions)
        .set({
          planId: paidPlan.id,
          status: "trialing",
          interval: "monthly",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          scheduledPlanId: null,
          cancelAtPeriodEnd: false,
          updatedAt: now,
        })
        .where(eq(organizationSubscriptions.organizationId, organizationId));
    });
  }

  async createInvoice(params: CreateInvoiceParams) {
    const existingPending = await db.query.subscriptionInvoices.findFirst({
      where: and(
        eq(subscriptionInvoices.organizationId, params.organizationId),
        eq(subscriptionInvoices.status, "pending"),
      ),
      orderBy: [desc(subscriptionInvoices.createdAt)],
    });
    if (existingPending) {
      throw new Error(`Organization already has an unpaid invoice (${existingPending.identifier}).`);
    }

    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, params.planCode),
    });
    if (!plan) {
      throw new Error("Plan not found.");
    }

    const price = await db.query.subscriptionPlanPrices.findFirst({
      where: and(
        eq(subscriptionPlanPrices.planId, plan.id),
        eq(subscriptionPlanPrices.interval, params.interval),
        eq(subscriptionPlanPrices.currency, "ZMW"),
        eq(subscriptionPlanPrices.isActive, true),
        isNull(subscriptionPlanPrices.effectiveTo),
      ),
      orderBy: [desc(subscriptionPlanPrices.effectiveFrom)],
    });
    if (!price) {
      throw new Error("Pricing not configured for this plan.");
    }

    const identifier = buildIdentifier("inv");
    try {
      const [invoice] = await db
        .insert(subscriptionInvoices)
        .values({
          organizationId: params.organizationId,
          planId: plan.id,
          interval: params.interval,
          currency: price.currency,
          amountCents: price.amountCents,
          identifier,
          status: "pending",
          dueAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour default
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return invoice!;
    } catch (e) {
      // Race safety: DB partial unique index enforces a single pending invoice per org.
      if (isPostgresUniqueViolation(e)) {
        const pending = await db.query.subscriptionInvoices.findFirst({
          where: and(
            eq(subscriptionInvoices.organizationId, params.organizationId),
            eq(subscriptionInvoices.status, "pending"),
          ),
          orderBy: [desc(subscriptionInvoices.createdAt)],
        });
        if (pending) {
          throw new Error(`Organization already has an unpaid invoice (${pending.identifier}).`);
        }
      }
      throw e;
    }
  }

  async findInvoiceByIdentifier(identifier: string) {
    return (
      (await db.query.subscriptionInvoices.findFirst({
        where: eq(subscriptionInvoices.identifier, identifier),
      })) ?? null
    );
  }

  async recordLipilaInitiation(invoiceId: string, params: RecordLipilaInitiationParams) {
    const invoice = await db.query.subscriptionInvoices.findFirst({
      where: eq(subscriptionInvoices.id, invoiceId),
    });
    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    const uuidRef = params.referenceId && isUuidLike(params.referenceId) ? params.referenceId : null;
    const refText = params.referenceId ?? null;
    const values = {
      organizationId: invoice.organizationId,
      invoiceId,
      identifier: params.identifier,
      referenceId: uuidRef,
      referenceIdText: refText,
      externalId: params.externalId ?? null,
      status: "pending" as const,
      message: params.message ?? null,
      rawPayload: params.rawPayload,
    };

    try {
      const [row] = await db.insert(lipilaTransactions).values(values).returning();
      return row!;
    } catch (e) {
      if (refText && isPostgresUniqueViolation(e)) {
        const [row] = await db
          .update(lipilaTransactions)
          .set({
            organizationId: invoice.organizationId,
            invoiceId,
            identifier: params.identifier,
            externalId: params.externalId ?? null,
            status: "pending",
            message: params.message ?? null,
            rawPayload: params.rawPayload,
          })
          .where(eq(lipilaTransactions.referenceIdText, refText))
          .returning();
        if (row) {
          return row;
        }
      }
      throw e;
    }
  }

  async recordLipilaCallback(invoiceId: string, payload: LipilaCallbackPayload) {
    const invoice = await db.query.subscriptionInvoices.findFirst({
      where: eq(subscriptionInvoices.id, invoiceId),
    });
    if (!invoice) {
      throw new Error("Invoice not found.");
    }

    const status: "successful" | "failed" =
      payload.status?.toLowerCase() === "successful" ? "successful" : "failed";
    const uuidRef = payload.referenceId && isUuidLike(payload.referenceId) ? payload.referenceId : null;
    const refText = payload.referenceId ?? null;
    const values = {
      organizationId: invoice.organizationId,
      invoiceId,
      identifier: payload.identifier ?? "unknown",
      referenceId: uuidRef,
      referenceIdText: refText,
      externalId: payload.externalId ?? null,
      status,
      message: payload.message ?? null,
      rawPayload: payload,
    };

    try {
      const [row] = await db.insert(lipilaTransactions).values(values).returning();
      return row!;
    } catch (e) {
      if (refText && isPostgresUniqueViolation(e)) {
        const [row] = await db
          .update(lipilaTransactions)
          .set({
            organizationId: invoice.organizationId,
            invoiceId,
            identifier: payload.identifier ?? "unknown",
            externalId: payload.externalId ?? null,
            status,
            message: payload.message ?? null,
            rawPayload: payload,
          })
          .where(eq(lipilaTransactions.referenceIdText, refText))
          .returning();
        if (row) {
          return row;
        }
      }
      throw e;
    }
  }

  async markInvoicePaid(invoiceId: string, paidAt: Date) {
    await db
      .update(subscriptionInvoices)
      .set({ status: "paid", paidAt, updatedAt: new Date() })
      .where(eq(subscriptionInvoices.id, invoiceId));
  }

  async activateOrgPlanFromInvoice(invoiceId: string) {
    const invoice = await db.query.subscriptionInvoices.findFirst({
      where: eq(subscriptionInvoices.id, invoiceId),
    });
    if (!invoice) {
      throw new Error("Invoice not found.");
    }
    if (invoice.status !== "paid") {
      throw new Error("Invoice is not paid.");
    }

    const currentPeriodStart = invoice.paidAt ?? new Date();
    const currentPeriodEnd = computePeriodEnd(currentPeriodStart, invoice.interval);
    const now = new Date();

    await db
      .insert(organizationSubscriptions)
      .values({
        organizationId: invoice.organizationId,
        planId: invoice.planId,
        interval: invoice.interval,
        status: "active",
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        scheduledPlanId: null,
        updatedAt: now,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: organizationSubscriptions.organizationId,
        set: {
          planId: invoice.planId,
          interval: invoice.interval,
          status: "active",
          currentPeriodStart,
          currentPeriodEnd,
          scheduledPlanId: null,
          updatedAt: now,
        },
      });
  }
}

export const billingRepository: BillingRepository = new BillingRepositoryImpl();

