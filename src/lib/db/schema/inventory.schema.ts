import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
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

export const supplierStatusEnum = pgEnum("supplier_status", ["active", "inactive"]);

export const productStatusEnum = pgEnum("product_status", ["active", "discontinued"]);

export const batchStatusEnum = pgEnum("batch_status", [
  "draft",
  "active",
  "quarantined",
  "expired",
  "disposed",
  "depleted",
]);

export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", [
  "receipt",
  "sale",
  "adjustment",
  "transfer_in",
  "transfer_out",
  "return",
  "disposal",
  "expiry_write_off",
]);

export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgNameUnique: uniqueIndex("product_categories_org_name_unique").on(
      table.organizationId,
      table.name,
    ),
  }),
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    contactName: text("contact_name"),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    website: text("website"),
    taxId: varchar("tax_id", { length: 64 }),
    status: supplierStatusEnum("status").notNull().default("active"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: varchar("city", { length: 128 }),
    state: varchar("state", { length: 128 }),
    postalCode: varchar("postal_code", { length: 32 }),
    country: varchar("country", { length: 2 }).default("US"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgNameUnique: uniqueIndex("suppliers_org_name_unique").on(table.organizationId, table.name),
    organizationIdx: index("suppliers_org_idx").on(table.organizationId),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => productCategories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    genericName: text("generic_name"),
    strength: varchar("strength", { length: 64 }),
    dosageForm: varchar("dosage_form", { length: 64 }),
    manufacturer: text("manufacturer"),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 128 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 32 }).notNull().default("unit"),
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    isControlledSubstance: boolean("is_controlled_substance").notNull().default(false),
    reorderLevel: integer("reorder_level").notNull().default(0),
    targetStockLevel: integer("target_stock_level").notNull().default(0),
    defaultSellingPriceCents: integer("default_selling_price_cents").notNull().default(0),
    status: productStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orgSkuUnique: uniqueIndex("products_org_sku_unique").on(table.organizationId, table.sku),
    orgBarcodeUnique: uniqueIndex("products_org_barcode_unique").on(
      table.organizationId,
      table.barcode,
    ),
    organizationIdx: index("products_org_idx").on(table.organizationId),
    orgNameIdx: index("products_org_name_idx").on(table.organizationId, table.name),
    categoryIdx: index("products_category_idx").on(table.categoryId),
  }),
);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    batchNumber: varchar("batch_number", { length: 64 }).notNull(),
    purchaseOrderNumber: varchar("purchase_order_number", { length: 64 }),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    manufacturedAt: date("manufactured_at"),
    expiresAt: date("expires_at").notNull(),
    quantityReceived: integer("quantity_received").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    unitCostCents: integer("unit_cost_cents").notNull(),
    unitSalePriceCents: integer("unit_sale_price_cents"),
    status: batchStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    branchProductBatchUnique: uniqueIndex("inventory_batches_branch_product_batch_unique").on(
      table.branchId,
      table.productId,
      table.batchNumber,
    ),
    branchStatusIdx: index("inventory_batches_branch_status_idx").on(table.branchId, table.status),
    productIdx: index("inventory_batches_product_idx").on(table.productId),
    expiryIdx: index("inventory_batches_expiry_idx").on(table.expiresAt),
    orgBranchExpiryIdx: index("inventory_batches_org_branch_expiry_idx").on(
      table.organizationId,
      table.branchId,
      table.expiresAt,
    ),
    orgBranchEligibleExpiryIdx: index("inventory_batches_org_branch_eligible_expiry_idx")
      .on(table.organizationId, table.branchId, table.expiresAt)
      .where(sql`${table.status} <> 'disposed' and ${table.quantityAvailable} > 0`),
    orgBranchProductStatusExpiryIdx: index("inventory_batches_org_branch_product_status_expiry_idx").on(
      table.organizationId,
      table.branchId,
      table.productId,
      table.status,
      table.expiresAt,
    ),
  }),
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    batchId: uuid("batch_id").references(() => inventoryBatches.id, { onDelete: "set null" }),
    performedByUserId: uuid("performed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    transactionType: inventoryTransactionTypeEnum("transaction_type").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    unitCostCents: integer("unit_cost_cents"),
    referenceType: varchar("reference_type", { length: 32 }),
    referenceId: uuid("reference_id"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    branchProductIdx: index("inventory_transactions_branch_product_idx").on(
      table.branchId,
      table.productId,
    ),
    batchOccurredIdx: index("inventory_transactions_batch_occurred_idx").on(
      table.batchId,
      table.occurredAt,
    ),
    orgBranchTypeOccurredIdx: index("inventory_transactions_org_branch_type_occurred_idx").on(
      table.organizationId,
      table.branchId,
      table.transactionType,
      table.occurredAt,
    ),
  }),
);
