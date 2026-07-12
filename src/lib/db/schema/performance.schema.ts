import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./account.schema";
import { branches } from "./branch.schema";

/**
 * Owner-set monthly revenue target for a branch. Drives the Home target card,
 * the progress ring, the pace warnings and the sales streak.
 *
 * One row per (branch, month). `month` is the first day of the target month in
 * the branch's OWN timezone — the engine computes progress over branch-local
 * day windows, so a UTC-anchored month would drift for non-UTC branches.
 */
export const branchMonthlyTargets = pgTable(
  "branch_monthly_targets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    /** First day of the target month, branch-local. e.g. 2026-07-01. */
    month: date("month").notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Staff see the percentage and the streak — never the kwacha amount. */
    showToStaff: boolean("show_to_staff").notNull().default(true),
    setByUserId: uuid("set_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    branchMonthUnique: uniqueIndex("branch_monthly_targets_branch_month_unique").on(
      table.branchId,
      table.month,
    ),
    orgMonthIdx: index("branch_monthly_targets_org_month_idx").on(
      table.organizationId,
      table.month,
    ),
  }),
);
