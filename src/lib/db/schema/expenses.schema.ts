import { index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./account.schema";
import { branches } from "./branch.schema";

export const expenseTypeEnum = pgEnum("expense_type", ["general", "restocking", "charge"]);

export const expenseChargeTypeEnum = pgEnum("expense_charge_type", [
  "momo_sale_fee",
  "wallet_withdrawal_fee",
]);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    expenseType: expenseTypeEnum("expense_type").notNull(),
    chargeType: expenseChargeTypeEnum("charge_type"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("ZMW"),
    description: text("description").notNull(),
    expenseDate: timestamp("expense_date", { withTimezone: true }).notNull(),
    sourceRef: varchar("source_ref", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgBranchDateIdx: index("expenses_org_branch_date_idx").on(
      table.organizationId,
      table.branchId,
      table.expenseDate,
    ),
    orgTypeIdx: index("expenses_org_type_idx").on(table.organizationId, table.expenseType),
    chargeUnique: uniqueIndex("expenses_org_charge_source_unique").on(
      table.organizationId,
      table.chargeType,
      table.sourceRef,
    ),
  }),
);

