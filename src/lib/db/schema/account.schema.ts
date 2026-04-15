import { sql } from "drizzle-orm";
import {
  boolean,
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

export const legalEntityTypeEnum = pgEnum("legal_entity_type", [
  "sole_proprietorship",
  "llc",
  "corporation",
  "partnership",
  "nonprofit",
  "other",
]);

export const organizationStatusEnum = pgEnum("organization_status", [
  "trial",
  "active",
  "suspended",
  "archived",
]);

export const appRoleEnum = pgEnum("app_role", [
  "owner",
  "admin",
  "manager",
  "pharmacist",
  "cashier",
  "analyst",
]);

export const userStatusEnum = pgEnum("user_status", ["invited", "active", "disabled"]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "invited",
  "active",
  "suspended",
  "removed",
]);

/** Dashboard settings: appearance + notification toggles (JSONB on `users.preferences`). */
export type UserPreferences = {
  theme: "light" | "dark" | "system";
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
};

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    legalName: text("legal_name"),
    displayName: text("display_name").notNull(),
    legalEntityType: legalEntityTypeEnum("legal_entity_type").notNull().default("llc"),
    taxId: varchar("tax_id", { length: 64 }),
    primaryEmail: varchar("primary_email", { length: 255 }).notNull(),
    primaryPhone: varchar("primary_phone", { length: 32 }),
    hqAddressLine1: text("hq_address_line_1"),
    hqAddressLine2: text("hq_address_line_2"),
    hqCity: varchar("hq_city", { length: 128 }),
    hqState: varchar("hq_state", { length: 128 }),
    hqPostalCode: varchar("hq_postal_code", { length: 32 }),
    hqCountry: varchar("hq_country", { length: 2 }).notNull().default("US"),
    status: organizationStatusEnum("status").notNull().default("trial"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("organizations_slug_unique").on(table.slug),
    taxIdUnique: uniqueIndex("organizations_tax_id_unique").on(table.taxId),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    fullName: text("full_name").notNull(),
    phone: varchar("phone", { length: 32 }),
    status: userStatusEnum("status").notNull().default("active"),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    /** Path within Supabase Storage bucket `user-avatars` (first segment = user id). */
    avatarStorageKey: text("avatar_storage_key"),
    preferences: jsonb("preferences").$type<UserPreferences | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull().default("pharmacist"),
    status: membershipStatusEnum("status").notNull().default("active"),
    jobTitle: varchar("job_title", { length: 128 }),
    /** Human-readable per-organization employee id (e.g. AP-00001); assigned on membership create. */
    staffEmployeeCode: varchar("staff_employee_code", { length: 32 }),
    isDefault: boolean("is_default").notNull().default(false),
    /** Module flags (stock, sales, insights, …); null means derive from `role` until backfilled. */
    capabilities: jsonb("capabilities").$type<Record<string, boolean> | null>(),
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgUserUnique: uniqueIndex("organization_memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    activeOrganizationIdx: index("organization_memberships_active_org_idx")
      .on(table.organizationId)
      .where(sql`${table.status} <> 'removed'`),
    organizationIdx: index("organization_memberships_org_idx").on(table.organizationId),
    userIdx: index("organization_memberships_user_idx").on(table.userId),
    orgStaffCodeUnique: uniqueIndex("organization_memberships_org_staff_code_unique")
      .on(table.organizationId, table.staffEmployeeCode)
      .where(sql`${table.staffEmployeeCode} IS NOT NULL`),
  }),
);
