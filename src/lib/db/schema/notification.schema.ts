import { sql } from "drizzle-orm";
import { date, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations, users } from "./account.schema";

/**
 * Notifications & device tokens.
 *
 * These tables are WRITTEN by the standalone `aurestores-engine` service (the
 * notification sender + scheduler), but their schema and migrations are owned
 * here so there is a single source of truth. Keep this file and the engine's
 * `db/schema.sql` snapshot in sync.
 */

/** Deep-link payload carried on a notification (mirrors the engine's Data). */
export type NotificationData = {
  route?: string;
  params?: Record<string, string>;
  entity_id?: string;
  branch_id?: string;
};

/**
 * One persisted alert addressed to exactly one user. `type` is a free-form
 * varchar (new notification types never need a migration); `category` is a
 * small stable set that drives per-category preferences and RBAC. `dedupe_key`
 * makes `(recipient_user_id, dedupe_key)` unique so retried callbacks and
 * re-run sweeps don't duplicate.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Free-form notification type, e.g. `low_stock`, `payment_succeeded`. */
    type: varchar("type", { length: 64 }).notNull(),
    /** Stable category: stock | sales | staff | pay | billing | compliance | system. */
    category: varchar("category", { length: 24 }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    data: jsonb("data").$type<NotificationData>().notNull().default(sql`'{}'::jsonb`),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    recipientCreatedIdx: index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    recipientUnreadIdx: index("notifications_recipient_unread_idx")
      .on(table.recipientUserId)
      .where(sql`${table.readAt} IS NULL`),
    /** Idempotency: at most one row per (recipient, dedupe_key) when a key is set. */
    recipientDedupeUnique: uniqueIndex("notifications_recipient_dedupe_unique")
      .on(table.recipientUserId, table.dedupeKey)
      .where(sql`${table.dedupeKey} IS NOT NULL`),
    organizationIdx: index("notifications_org_idx").on(table.organizationId),
  }),
);

/**
 * One row per inventory batch the engine has already sent an expiry alert for.
 * The expiry sweep excludes any batch present here, so a batch nearing expiry is
 * notified exactly ONCE instead of every day it sits inside the 30-day window
 * (the engine upserts with ON CONFLICT (batch_id) DO NOTHING). Written by the
 * engine; schema owned here. Keep in sync with the engine's `db/schema.sql`.
 */
export const batchExpiryAlerts = pgTable(
  "batch_expiry_alerts",
  {
    batchId: uuid("batch_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    branchId: uuid("branch_id").notNull(),
    productId: uuid("product_id").notNull(),
    /** The batch's expiry date at the time it was alerted (audit/debug only). */
    expiresAt: date("expires_at").notNull(),
    notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    branchIdx: index("batch_expiry_alerts_branch_idx").on(table.branchId),
  }),
);

/**
 * A registered push target. A user may have many devices; a notification fans
 * out to all of them. `token` is unique — re-registering a token owned by
 * another user reassigns it (a device handed to a new person).
 */
export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    /** android | ios | web. */
    platform: varchar("platform", { length: 10 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex("device_tokens_token_unique").on(table.token),
    userIdx: index("device_tokens_user_idx").on(table.userId),
  }),
);
