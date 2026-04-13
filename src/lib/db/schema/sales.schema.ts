import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./account.schema";
import { branches } from "./branch.schema";
import { inventoryBatches, products } from "./inventory.schema";

export const patientGenderEnum = pgEnum("patient_gender", ["unknown", "female", "male", "other"]);

export const prescriptionStatusEnum = pgEnum("prescription_status", [
  "draft",
  "active",
  "fulfilled",
  "partially_fulfilled",
  "expired",
  "cancelled",
]);

export const saleStatusEnum = pgEnum("sale_status", ["draft", "completed", "voided", "refunded"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "aura_pay_wallet",
  "card",
  "cash",
  "insurance",
  "bank_transfer",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "partially_paid",
  "failed",
  "refunded",
]);

export const loyaltyTierEnum = pgEnum("loyalty_tier", ["bronze", "silver", "gold", "platinum"]);

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    patientCode: varchar("patient_code", { length: 32 }).notNull(),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 32 }),
    email: varchar("email", { length: 255 }),
    dateOfBirth: date("date_of_birth"),
    gender: patientGenderEnum("gender").notNull().default("unknown"),
    notes: text("notes"),
    isRewardsMember: boolean("is_rewards_member").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgPatientCodeUnique: uniqueIndex("patients_org_patient_code_unique").on(
      table.organizationId,
      table.patientCode,
    ),
    organizationIdx: index("patients_org_idx").on(table.organizationId),
    orgPhoneIdx: index("patients_org_phone_idx").on(table.organizationId, table.phone),
  }),
);

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    rxNumber: varchar("rx_number", { length: 64 }).notNull(),
    prescriberName: text("prescriber_name"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: prescriptionStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgRxUnique: uniqueIndex("prescriptions_org_rx_number_unique").on(
      table.organizationId,
      table.rxNumber,
    ),
    patientIdx: index("prescriptions_patient_idx").on(table.patientId),
  }),
);

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    dosageInstructions: text("dosage_instructions"),
    quantityPrescribed: integer("quantity_prescribed").notNull(),
    quantityDispensed: integer("quantity_dispensed").notNull().default(0),
    refillsAuthorized: integer("refills_authorized").notNull().default(0),
    refillsRemaining: integer("refills_remaining").notNull().default(0),
  },
  (table) => ({
    prescriptionIdx: index("prescription_items_prescription_idx").on(table.prescriptionId),
  }),
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    saleNumber: varchar("sale_number", { length: 64 }).notNull(),
    patientId: uuid("patient_id").references(() => patients.id, { onDelete: "set null" }),
    prescriptionId: uuid("prescription_id").references(() => prescriptions.id, {
      onDelete: "set null",
    }),
    servedByUserId: uuid("served_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: saleStatusEnum("status").notNull().default("draft"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    discountCode: varchar("discount_code", { length: 64 }),
    notes: text("notes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSaleNumberUnique: uniqueIndex("sales_org_sale_number_unique").on(
      table.organizationId,
      table.saleNumber,
    ),
    orgCompletedCreatedIdx: index("sales_org_completed_created_idx")
      .on(table.organizationId, table.createdAt)
      .where(sql`${table.status} = 'completed'`),
    branchCreatedIdx: index("sales_branch_created_idx").on(table.branchId, table.createdAt),
    orgBranchStatusCreatedIdx: index("sales_org_branch_status_created_idx").on(
      table.organizationId,
      table.branchId,
      table.status,
      table.createdAt,
    ),
    orgStatusBranchIdx: index("sales_org_status_branch_idx").on(
      table.organizationId,
      table.status,
      table.branchId,
    ),
    patientIdx: index("sales_patient_idx").on(table.patientId),
  }),
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    batchId: uuid("batch_id").references(() => inventoryBatches.id, { onDelete: "set null" }),
    prescriptionItemId: uuid("prescription_item_id").references(() => prescriptionItems.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    taxRateBps: integer("tax_rate_bps").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    lineSubtotalCents: integer("line_subtotal_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (table) => ({
    saleIdx: index("sale_items_sale_idx").on(table.saleId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    reference: varchar("reference", { length: 128 }),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    saleIdx: index("payments_sale_idx").on(table.saleId),
    referenceIdx: index("payments_reference_idx").on(table.reference),
  }),
);

export const loyaltyAccounts = pgTable(
  "loyalty_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    tier: loyaltyTierEnum("tier").notNull().default("bronze"),
    pointsBalance: integer("points_balance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    patientUnique: uniqueIndex("loyalty_accounts_patient_unique").on(table.patientId),
  }),
);

export const loyaltyLedger = pgTable(
  "loyalty_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => loyaltyAccounts.id, { onDelete: "cascade" }),
    saleId: uuid("sale_id").references(() => sales.id, { onDelete: "set null" }),
    pointsDelta: integer("points_delta").notNull(),
    reason: text("reason").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    accountIdx: index("loyalty_ledger_account_idx").on(table.accountId),
  }),
);
