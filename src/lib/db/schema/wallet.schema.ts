import {
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
import { organizations } from "./account.schema";
import { branches } from "./branch.schema";
import { payments } from "./sales.schema";

export const walletStatusEnum = pgEnum("wallet_status", ["active", "suspended"]);

export const walletLedgerEntryTypeEnum = pgEnum("wallet_ledger_entry_type", [
  "settlement",
  "withdrawal",
  "adjustment",
  "refund",
]);

export const walletLedgerSourceMethodEnum = pgEnum("wallet_ledger_source_method", [
  "card",
  "mobile_money",
  "manual",
]);

export const walletLedgerEntryStatusEnum = pgEnum("wallet_ledger_entry_status", [
  "pending",
  "posted",
  "failed",
  "cancelled",
]);

export const walletAccounts = pgTable(
  "wallet_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    balanceCents: integer("balance_cents").notNull().default(0),
    status: walletStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBranchUnique: uniqueIndex("wallet_accounts_org_branch_unique").on(
      table.organizationId,
      table.branchId,
    ),
    organizationIdx: index("wallet_accounts_org_idx").on(table.organizationId),
    branchIdx: index("wallet_accounts_branch_idx").on(table.branchId),
  }),
);

export const walletLedgerEntries = pgTable(
  "wallet_ledger_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => walletAccounts.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    entryType: walletLedgerEntryTypeEnum("entry_type").notNull(),
    sourceMethod: walletLedgerSourceMethodEnum("source_method").notNull().default("manual"),
    status: walletLedgerEntryStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    reference: varchar("reference", { length: 128 }),
    mobileNumber: varchar("mobile_number", { length: 32 }),
    note: text("note"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
  },
  (table) => ({
    walletCreatedIdx: index("wallet_ledger_entries_wallet_created_idx").on(
      table.walletId,
      table.createdAt,
    ),
    orgBranchCreatedIdx: index("wallet_ledger_entries_org_branch_created_idx").on(
      table.organizationId,
      table.branchId,
      table.createdAt,
    ),
    paymentIdx: index("wallet_ledger_entries_payment_idx").on(table.paymentId),
  }),
);
