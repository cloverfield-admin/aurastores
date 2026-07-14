import { desc } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations, users } from "./account.schema";

/**
 * Audit trail for platform-admin (`aurastores_admin`) mutations.
 *
 * Every superuser write — editing a company, changing its plan, suspending it,
 * disabling a user, starting an impersonation session — inserts exactly one row
 * here, in the SAME transaction as the mutation it records. These are
 * cross-tenant, destructive powers with no other paper trail.
 *
 * Actor and target identity are DENORMALIZED (`actorEmail`,
 * `targetOrganizationName`, `targetUserEmail`) on purpose. The daily
 * account-purge sweep hard-DELETEs users and organizations, and the FKs below are
 * ON DELETE SET NULL — so without the text snapshots, purging a store would erase
 * the record of who suspended it and why, which is exactly the record you most
 * want to keep.
 *
 * `action` and `targetType` are varchar, not pg enums: new actions would
 * otherwise need an ALTER TYPE migration each time, the engine compares them as
 * strings, and the engine's schema snapshot degrades enums to varchar anyway.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorEmail: varchar("actor_email", { length: 255 }).notNull().default(""),

    /** e.g. `organization.suspended`, `subscription.set_plan`, `impersonation.start`. */
    action: varchar("action", { length: 64 }).notNull(),
    /** e.g. `organization`, `user`, `membership`, `plan_price`. */
    targetType: varchar("target_type", { length: 32 }).notNull(),

    targetOrganizationId: uuid("target_organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    targetOrganizationName: text("target_organization_name").notNull().default(""),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    targetUserEmail: varchar("target_user_email", { length: 255 }).notNull().default(""),

    /** Human-readable one-liner rendered in the audit table. */
    summary: text("summary").notNull().default(""),
    /**
     * Only the keys that actually changed. Named `payload_*` because `before` is a
     * reserved word in Postgres.
     */
    payloadBefore: jsonb("payload_before").$type<Record<string, unknown> | null>(),
    payloadAfter: jsonb("payload_after").$type<Record<string, unknown> | null>(),

    /** Ties the row to the engine's structured request log. */
    correlationId: varchar("correlation_id", { length: 64 }).notNull().default(""),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index("admin_audit_log_created_idx").on(desc(table.createdAt)),
    actorCreatedIdx: index("admin_audit_log_actor_created_idx").on(
      table.actorUserId,
      desc(table.createdAt),
    ),
    targetOrgCreatedIdx: index("admin_audit_log_target_org_created_idx").on(
      table.targetOrganizationId,
      desc(table.createdAt),
    ),
    actionCreatedIdx: index("admin_audit_log_action_created_idx").on(
      table.action,
      desc(table.createdAt),
    ),
  }),
);
