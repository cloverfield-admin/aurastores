import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./account.schema";

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

