import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./account.schema";

export const idempotencyRequests = pgTable(
  "idempotency_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 128 }).notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgScopeKeyUnique: uniqueIndex("idempotency_requests_org_scope_key_unique").on(
      table.organizationId,
      table.scope,
      table.idempotencyKey,
    ),
    orgCreatedIdx: index("idempotency_requests_org_created_idx").on(table.organizationId, table.createdAt),
  }),
);
