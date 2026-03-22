import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { appRoleEnum, organizations, users } from "./account.schema";

export const branchTypeEnum = pgEnum("branch_type", ["main", "retail", "warehouse"]);

export const branchStatusEnum = pgEnum("branch_status", ["draft", "active", "inactive", "syncing"]);

export const branchStaffStatusEnum = pgEnum("branch_staff_status", ["active", "inactive"]);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    type: branchTypeEnum("type").notNull().default("retail"),
    status: branchStatusEnum("status").notNull().default("draft"),
    isPrimary: boolean("is_primary").notNull().default(false),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    city: varchar("city", { length: 128 }),
    state: varchar("state", { length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
    country: varchar("country", { length: 2 }).notNull().default("US"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
    licensedPharmacistCount: integer("licensed_pharmacist_count").notNull().default(1),
    leadPharmacistUserId: uuid("lead_pharmacist_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    openedAt: date("opened_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgCodeUnique: uniqueIndex("branches_org_code_unique").on(table.organizationId, table.code),
    orgNameUnique: uniqueIndex("branches_org_name_unique").on(table.organizationId, table.name),
    organizationIdx: index("branches_org_idx").on(table.organizationId),
    statusIdx: index("branches_status_idx").on(table.status),
  }),
);

export const branchOperatingHours = pgTable(
  "branch_operating_hours",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    dayOfWeek: smallint("day_of_week").notNull(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
    isClosed: boolean("is_closed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    branchDayUnique: uniqueIndex("branch_operating_hours_branch_day_unique").on(
      table.branchId,
      table.dayOfWeek,
    ),
  }),
);

export const branchStaffAssignments = pgTable(
  "branch_staff_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull().default("pharmacist"),
    status: branchStaffStatusEnum("status").notNull().default("active"),
    isLead: boolean("is_lead").notNull().default(false),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true }),
  },
  (table) => ({
    branchUserUnique: uniqueIndex("branch_staff_assignments_branch_user_unique").on(
      table.branchId,
      table.userId,
    ),
    branchIdx: index("branch_staff_assignments_branch_idx").on(table.branchId),
    userIdx: index("branch_staff_assignments_user_idx").on(table.userId),
  }),
);
