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
import { organizations, users } from "./account.schema";
import { branches } from "./branch.schema";

export const onboardingStepEnum = pgEnum("onboarding_step", [
  "identity",
  "location_details",
  "license",
  "review",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "draft",
  "in_review",
  "approved",
  "rejected",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "pharmacy_operation_license",
  "pharmacist_in_charge_certificate",
  "dea_registration",
  "state_board_license",
  "liability_insurance",
  "business_registration",
  "trade_license",
  "other",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "under_review",
  "approved",
  "rejected",
  "expired",
]);

export const organizationOnboarding = pgTable(
  "organization_onboarding",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    mainBranchId: uuid("main_branch_id").references(() => branches.id, { onDelete: "set null" }),
    currentStep: onboardingStepEnum("current_step").notNull().default("identity"),
    furthestStepIndex: integer("furthest_step_index").notNull().default(0),
    status: onboardingStatusEnum("status").notNull().default("draft"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationUnique: uniqueIndex("organization_onboarding_org_unique").on(table.organizationId),
    statusIdx: index("organization_onboarding_status_idx").on(table.status),
  }),
);

export const complianceDocuments = pgTable(
  "compliance_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    documentType: documentTypeEnum("document_type").notNull(),
    status: documentStatusEnum("status").notNull().default("uploaded"),
    fileName: text("file_name").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    licenseNumber: varchar("license_number", { length: 128 }),
    issuer: text("issuer"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    organizationIdx: index("compliance_documents_org_idx").on(table.organizationId),
    typeStatusIdx: index("compliance_documents_type_status_idx").on(
      table.documentType,
      table.status,
    ),
  }),
);
