import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appRoleEnum, organizations, users } from "./account.schema";

export const staffInvitationStatusEnum = pgEnum("staff_invitation_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);

export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    appRole: appRoleEnum("app_role").notNull(),
    jobTitle: varchar("job_title", { length: 128 }),
    branchIds: jsonb("branch_ids").$type<string[]>().notNull(),
    capabilities: jsonb("capabilities").$type<Record<string, boolean> | null>(),
    status: staffInvitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    authUserId: uuid("auth_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("staff_invitations_org_idx").on(table.organizationId),
    orgEmailPendingUnique: uniqueIndex("staff_invitations_org_email_pending_unique")
      .on(table.organizationId, sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
  }),
);
