import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations, users } from "./account.schema";

export const subscriptionPlanCodeEnum = pgEnum("subscription_plan_code", [
  "free",
  "basic",
  "pro",
  "enterprise",
]);

export const subscriptionIntervalEnum = pgEnum("subscription_interval", ["monthly", "quarterly", "yearly"]);

export const organizationSubscriptionStatusEnum = pgEnum("organization_subscription_status", [
  "active",
  "past_due",
  "canceled",
  "pending_payment",
  "trialing",
]);

export const subscriptionInvoiceStatusEnum = pgEnum("subscription_invoice_status", [
  "pending",
  "paid",
  "failed",
  "expired",
]);

export const lipilaTransactionStatusEnum = pgEnum("lipila_transaction_status", ["pending", "successful", "failed"]);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: subscriptionPlanCodeEnum("code").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    isPublic: boolean("is_public").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    codeUnique: uniqueIndex("subscription_plans_code_unique").on(table.code),
    publicSortIdx: index("subscription_plans_public_sort_idx").on(table.isPublic, table.sortOrder),
  }),
);

export type SubscriptionPlanFeatures = {
  capabilities: {
    stock: boolean;
    sales: boolean;
    catalog: boolean;
    insights: boolean;
    pay: boolean;
    staff: boolean;
    expenses: boolean;
    organization: boolean;
  };
  limits: {
    products: number | null;
    salesTransactions: number | null;
    categories: number | null;
    staffUsers: number | null;
    branches: number | null;
  };
};

export const subscriptionPlanFeatures = pgTable(
  "subscription_plan_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    features: jsonb("features").$type<SubscriptionPlanFeatures>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planUnique: uniqueIndex("subscription_plan_features_plan_unique").on(table.planId),
  }),
);

export const subscriptionPlanPrices = pgTable(
  "subscription_plan_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    interval: subscriptionIntervalEnum("interval").notNull(),
    /** Stored in minor currency units (e.g. cents). */
    amountCents: integer("amount_cents").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    planIntervalIdx: index("subscription_plan_prices_plan_interval_idx").on(table.planId, table.interval),
    activeLookupIdx: index("subscription_plan_prices_active_lookup_idx").on(
      table.currency,
      table.interval,
      table.isActive,
      table.effectiveFrom,
    ),
  }),
);

export const organizationSubscriptions = pgTable(
  "organization_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    interval: subscriptionIntervalEnum("interval").notNull().default("monthly"),
    status: organizationSubscriptionStatusEnum("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    scheduledPlanId: uuid("scheduled_plan_id").references(() => subscriptionPlans.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUnique: uniqueIndex("organization_subscriptions_org_unique").on(table.organizationId),
    orgStatusIdx: index("organization_subscriptions_org_status_idx").on(table.organizationId, table.status),
  }),
);

export const subscriptionInvoices = pgTable(
  "subscription_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    interval: subscriptionIntervalEnum("interval").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    amountCents: integer("amount_cents").notNull(),
    /** Our internal identifier used with Lipila callbacks. */
    identifier: varchar("identifier", { length: 128 }).notNull(),
    status: subscriptionInvoiceStatusEnum("status").notNull().default("pending"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgStatusCreatedIdx: index("subscription_invoices_org_status_created_idx").on(
      table.organizationId,
      table.status,
      table.createdAt,
    ),
    orgPendingUnique: uniqueIndex("subscription_invoices_org_pending_unique")
      .on(table.organizationId)
      .where(sql`${table.status} = 'pending'`),
    identifierUnique: uniqueIndex("subscription_invoices_identifier_unique").on(table.identifier),
  }),
);

export const lipilaTransactions = pgTable(
  "lipila_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => subscriptionInvoices.id, { onDelete: "cascade" }),
    /** Our internal identifier used when initiating the transaction. */
    identifier: varchar("identifier", { length: 128 }).notNull(),
    referenceId: uuid("reference_id"),
    /** Lipila collections reference ID (not guaranteed to be a UUID). */
    referenceIdText: varchar("reference_id_text", { length: 128 }),
    externalId: varchar("external_id", { length: 128 }),
    status: lipilaTransactionStatusEnum("status").notNull(),
    message: text("message"),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCreatedIdx: index("lipila_transactions_org_created_idx").on(table.organizationId, table.createdAt),
    identifierIdx: index("lipila_transactions_identifier_idx").on(table.identifier),
    referenceUnique: uniqueIndex("lipila_transactions_reference_unique").on(table.referenceId),
    referenceTextUnique: uniqueIndex("lipila_transactions_reference_text_unique").on(table.referenceIdText),
  }),
);


/**
 * Store billing (Apple / Google in-app purchases, via RevenueCat).
 *
 * Mobile must sell plans through the stores — Apple's B2B carve-out only covers
 * apps sold exclusively to organizations, and AuraStores is self-serve, so a
 * single-owner shop upgrading is a "single user" sale that requires IAP.
 *
 * RevenueCat is only a payment + receipt-validation layer: a store purchase
 * activates the same `organization_subscriptions` row the Lipila (mobile money)
 * rail activates, so entitlements stay single-sourced in Postgres regardless of
 * how the customer paid.
 */

export const storeEnum = pgEnum("store_kind", ["APP_STORE", "PLAY_STORE"]);

export const storeEnvironmentEnum = pgEnum("store_environment", ["PRODUCTION", "SANDBOX"]);

/**
 * Maps a RevenueCat customer onto the organization whose plan their purchase funds.
 *
 * `rcAppUserId` is the Supabase user id: RevenueCat requires a unique App User ID
 * per person and explicitly forbids org-level identifiers (a shared id would make
 * staff inherit each other's subscriptions). The org therefore cannot travel on the
 * purchase itself — this link is what lets the webhook, which only ever sees an
 * app_user_id, find the right organization.
 *
 * Written by the authenticated `POST /api/v1/billing/store/sync` call, where the
 * org comes from the caller's JWT.
 */
export const storeSubscriptions = pgTable(
  "store_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** RevenueCat App User ID — the Supabase user id. */
    rcAppUserId: varchar("rc_app_user_id", { length: 128 }).notNull(),
    store: storeEnum("store").notNull(),
    productId: varchar("product_id", { length: 128 }).notNull().default(""),
    entitlementId: varchar("entitlement_id", { length: 64 }).notNull().default(""),
    planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: "set null" }),
    periodType: varchar("period_type", { length: 24 }).notNull().default(""),
    environment: storeEnvironmentEnum("environment").notNull().default("PRODUCTION"),
    originalTransactionId: varchar("original_transaction_id", { length: 128 }).notNull().default(""),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /** One row per RevenueCat customer: renewals update it in place. */
    rcUserUnique: uniqueIndex("store_subscriptions_rc_user_unique").on(table.rcAppUserId),
    orgIdx: index("store_subscriptions_org_idx").on(table.organizationId),
  }),
);

/**
 * Idempotency ledger for RevenueCat webhooks. RevenueCat reuses the same event id
 * when it retries, so the unique index on `event_id` makes a redelivery a no-op —
 * without it a retried INITIAL_PURCHASE would grant a second billing period.
 */
export const storeWebhookEvents = pgTable(
  "store_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: varchar("event_id", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 48 }).notNull(),
    appUserId: varchar("app_user_id", { length: 128 }).notNull().default(""),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /**
     * Stamped once the event has been APPLIED to the org's subscription — not when
     * it was received. NULL means "recorded but not yet applied", which is what makes
     * a RevenueCat retry re-apply it instead of being written off as a duplicate.
     */
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => ({
    eventIdUnique: uniqueIndex("store_webhook_events_event_id_unique").on(table.eventId),
  }),
);
