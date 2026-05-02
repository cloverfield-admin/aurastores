import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./account.schema";
import { payments } from "./sales.schema";
import { walletLedgerEntries } from "./wallet.schema";

export const lipilaPaymentOperationEnum = pgEnum("lipila_payment_operation", [
  "sale_collection",
  "wallet_disbursement",
]);

export const lipilaPaymentStatusEnum = pgEnum("lipila_payment_status", [
  "pending",
  "successful",
  "failed",
]);

export const lipilaFeePayerEnum = pgEnum("lipila_fee_payer", ["merchant", "customer", "wallet"]);

export const lipilaPaymentTransactions = pgTable(
  "lipila_payment_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
    walletLedgerEntryId: uuid("wallet_ledger_entry_id").references(() => walletLedgerEntries.id, {
      onDelete: "set null",
    }),
    operation: lipilaPaymentOperationEnum("operation").notNull(),
    referenceId: varchar("reference_id", { length: 128 }).notNull(),
    identifier: varchar("identifier", { length: 128 }),
    externalId: varchar("external_id", { length: 128 }),
    status: lipilaPaymentStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    grossAmountCents: integer("gross_amount_cents").notNull(),
    feeCents: integer("fee_cents").notNull().default(0),
    netAmountCents: integer("net_amount_cents").notNull(),
    feeBps: integer("fee_bps").notNull().default(0),
    feePayer: lipilaFeePayerEnum("fee_payer").notNull().default("merchant"),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    accountNumberMasked: varchar("account_number_masked", { length: 32 }),
    message: text("message"),
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationCreatedIdx: index("lipila_payment_transactions_org_created_idx").on(
      table.organizationId,
      table.createdAt,
    ),
    operationStatusIdx: index("lipila_payment_transactions_operation_status_idx").on(
      table.operation,
      table.status,
    ),
    paymentIdx: index("lipila_payment_transactions_payment_idx").on(table.paymentId),
    walletLedgerEntryIdx: index("lipila_payment_transactions_wallet_ledger_entry_idx").on(
      table.walletLedgerEntryId,
    ),
    referenceUnique: uniqueIndex("lipila_payment_transactions_reference_unique").on(table.referenceId),
  }),
);
