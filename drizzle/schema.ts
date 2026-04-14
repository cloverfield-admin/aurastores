import { pgTable, uniqueIndex, uuid, varchar, text, timestamp, index, foreignKey, boolean, doublePrecision, integer, date, smallint, time, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const appRole = pgEnum("app_role", ['owner', 'admin', 'manager', 'pharmacist', 'cashier', 'analyst'])
export const batchStatus = pgEnum("batch_status", ['draft', 'active', 'quarantined', 'expired', 'disposed', 'depleted'])
export const branchStaffStatus = pgEnum("branch_staff_status", ['active', 'inactive'])
export const branchStatus = pgEnum("branch_status", ['draft', 'active', 'inactive', 'syncing'])
export const branchType = pgEnum("branch_type", ['main', 'retail', 'warehouse'])
export const documentStatus = pgEnum("document_status", ['uploaded', 'under_review', 'approved', 'rejected', 'expired'])
export const documentType = pgEnum("document_type", ['pharmacy_operation_license', 'pharmacist_in_charge_certificate', 'dea_registration', 'state_board_license', 'liability_insurance', 'other'])
export const inventoryTransactionType = pgEnum("inventory_transaction_type", ['receipt', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'disposal', 'expiry_write_off'])
export const legalEntityType = pgEnum("legal_entity_type", ['sole_proprietorship', 'llc', 'corporation', 'partnership', 'nonprofit', 'other'])
export const loyaltyTier = pgEnum("loyalty_tier", ['bronze', 'silver', 'gold', 'platinum'])
export const membershipStatus = pgEnum("membership_status", ['invited', 'active', 'suspended', 'removed'])
export const onboardingStatus = pgEnum("onboarding_status", ['draft', 'in_review', 'approved', 'rejected'])
export const onboardingStep = pgEnum("onboarding_step", ['identity', 'pharmacy_details', 'license', 'review'])
export const organizationStatus = pgEnum("organization_status", ['trial', 'active', 'suspended', 'archived'])
export const patientGender = pgEnum("patient_gender", ['unknown', 'female', 'male', 'other'])
export const paymentMethod = pgEnum("payment_method", ['aura_pay_wallet', 'card', 'cash', 'insurance', 'bank_transfer'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'paid', 'partially_paid', 'failed', 'refunded'])
export const prescriptionStatus = pgEnum("prescription_status", ['draft', 'active', 'fulfilled', 'partially_fulfilled', 'expired', 'cancelled'])
export const productStatus = pgEnum("product_status", ['active', 'discontinued'])
export const saleStatus = pgEnum("sale_status", ['draft', 'completed', 'voided', 'refunded'])
export const supplierStatus = pgEnum("supplier_status", ['active', 'inactive'])
export const userStatus = pgEnum("user_status", ['invited', 'active', 'disabled'])


export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	slug: varchar({ length: 64 }).notNull(),
	legalName: text("legal_name"),
	displayName: text("display_name").notNull(),
	legalEntityType: legalEntityType("legal_entity_type").default('llc').notNull(),
	taxId: varchar("tax_id", { length: 64 }),
	primaryEmail: varchar("primary_email", { length: 255 }).notNull(),
	primaryPhone: varchar("primary_phone", { length: 32 }),
	hqAddressLine1: text("hq_address_line_1"),
	hqAddressLine2: text("hq_address_line_2"),
	hqCity: varchar("hq_city", { length: 128 }),
	hqState: varchar("hq_state", { length: 128 }),
	hqPostalCode: varchar("hq_postal_code", { length: 32 }),
	hqCountry: varchar("hq_country", { length: 2 }).default('US').notNull(),
	status: organizationStatus().default('trial').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("organizations_slug_unique").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	uniqueIndex("organizations_tax_id_unique").using("btree", table.taxId.asc().nullsLast().op("text_ops")),
]);

export const organizationMemberships = pgTable("organization_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: appRole().default('pharmacist').notNull(),
	status: membershipStatus().default('active').notNull(),
	jobTitle: varchar("job_title", { length: 128 }),
	staffEmployeeCode: varchar("staff_employee_code", { length: 32 }),
	isDefault: boolean("is_default").default(false).notNull(),
	invitedAt: timestamp("invited_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	joinedAt: timestamp("joined_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("organization_memberships_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("organization_memberships_org_user_unique").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("organization_memberships_org_staff_code_unique").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.staffEmployeeCode.asc().nullsLast().op("text_ops")).where(sql`${table.staffEmployeeCode} IS NOT NULL`),
	index("organization_memberships_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_memberships_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_memberships_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	fullName: text("full_name").notNull(),
	phone: varchar({ length: 32 }),
	status: userStatus().default('active').notNull(),
	isEmailVerified: boolean("is_email_verified").default(false).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("users_email_unique").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const branches = pgTable("branches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	code: varchar({ length: 32 }).notNull(),
	name: text().notNull(),
	type: branchType().default('retail').notNull(),
	status: branchStatus().default('draft').notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 32 }),
	addressLine1: text("address_line_1").notNull(),
	addressLine2: text("address_line_2"),
	city: varchar({ length: 128 }),
	state: varchar({ length: 128 }),
	postalCode: varchar("postal_code", { length: 32 }),
	country: varchar({ length: 2 }).default('US').notNull(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	timezone: varchar({ length: 64 }).default('UTC').notNull(),
	licensedPharmacistCount: integer("licensed_pharmacist_count").default(1).notNull(),
	leadPharmacistUserId: uuid("lead_pharmacist_user_id"),
	openedAt: date("opened_at"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("branches_org_code_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("uuid_ops")),
	index("branches_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("branches_org_name_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("branches_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.leadPharmacistUserId],
			foreignColumns: [users.id],
			name: "branches_lead_pharmacist_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "branches_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const branchOperatingHours = pgTable("branch_operating_hours", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id").notNull(),
	dayOfWeek: smallint("day_of_week").notNull(),
	opensAt: time("opens_at"),
	closesAt: time("closes_at"),
	isClosed: boolean("is_closed").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("branch_operating_hours_branch_day_unique").using("btree", table.branchId.asc().nullsLast().op("int2_ops"), table.dayOfWeek.asc().nullsLast().op("int2_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "branch_operating_hours_branch_id_branches_id_fk"
		}).onDelete("cascade"),
]);

export const branchStaffAssignments = pgTable("branch_staff_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	branchId: uuid("branch_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: appRole().default('pharmacist').notNull(),
	status: branchStaffStatus().default('active').notNull(),
	isLead: boolean("is_lead").default(false).notNull(),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	unassignedAt: timestamp("unassigned_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("branch_staff_assignments_branch_idx").using("btree", table.branchId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("branch_staff_assignments_branch_user_unique").using("btree", table.branchId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("branch_staff_assignments_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "branch_staff_assignments_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "branch_staff_assignments_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const inventoryBatches = pgTable("inventory_batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id").notNull(),
	productId: uuid("product_id").notNull(),
	supplierId: uuid("supplier_id"),
	batchNumber: varchar("batch_number", { length: 64 }).notNull(),
	purchaseOrderNumber: varchar("purchase_order_number", { length: 64 }),
	receivedAt: timestamp("received_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	manufacturedAt: date("manufactured_at"),
	expiresAt: date("expires_at").notNull(),
	quantityReceived: integer("quantity_received").notNull(),
	quantityAvailable: integer("quantity_available").notNull(),
	unitOrderPriceCents: integer("unit_order_price_cents").notNull(),
	unitSalePriceCents: integer("unit_sale_price_cents"),
	status: batchStatus().default('active').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("inventory_batches_batch_number_trgm_idx").using("gin", table.batchNumber.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("inventory_batches_branch_product_batch_unique").using("btree", table.branchId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("text_ops"), table.batchNumber.asc().nullsLast().op("uuid_ops")),
	index("inventory_batches_branch_status_idx").using("btree", table.branchId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("inventory_batches_expiry_idx").using("btree", table.expiresAt.asc().nullsLast().op("date_ops")),
	index("inventory_batches_org_branch_expiry_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.branchId.asc().nullsLast().op("date_ops"), table.expiresAt.asc().nullsLast().op("uuid_ops")),
	index("inventory_batches_product_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "inventory_batches_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "inventory_batches_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_batches_product_id_products_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "inventory_batches_supplier_id_suppliers_id_fk"
		}).onDelete("set null"),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	categoryId: uuid("category_id"),
	name: text().notNull(),
	genericName: text("generic_name"),
	strength: varchar({ length: 64 }),
	dosageForm: varchar("dosage_form", { length: 64 }),
	manufacturer: text(),
	sku: varchar({ length: 64 }).notNull(),
	barcode: varchar({ length: 128 }),
	unitOfMeasure: varchar("unit_of_measure", { length: 32 }).default('unit').notNull(),
	requiresPrescription: boolean("requires_prescription").default(false).notNull(),
	isControlledSubstance: boolean("is_controlled_substance").default(false).notNull(),
	reorderLevel: integer("reorder_level").default(0).notNull(),
	targetStockLevel: integer("target_stock_level").default(0).notNull(),
	defaultSellingPriceCents: integer("default_selling_price_cents").default(0).notNull(),
	status: productStatus().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("products_category_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("products_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("products_org_barcode_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.barcode.asc().nullsLast().op("text_ops")),
	index("products_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("products_org_sku_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.sku.asc().nullsLast().op("text_ops")),
	index("products_sku_trgm_idx").using("gin", table.sku.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [productCategories.id],
			name: "products_category_id_product_categories_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "products_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const suppliers = pgTable("suppliers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	contactName: text("contact_name"),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 32 }),
	website: text(),
	taxId: varchar("tax_id", { length: 64 }),
	status: supplierStatus().default('active').notNull(),
	addressLine1: text("address_line_1"),
	addressLine2: text("address_line_2"),
	city: varchar({ length: 128 }),
	state: varchar({ length: 128 }),
	postalCode: varchar("postal_code", { length: 32 }),
	country: varchar({ length: 2 }).default('US'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("suppliers_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	index("suppliers_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("suppliers_org_name_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "suppliers_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id").notNull(),
	productId: uuid("product_id").notNull(),
	batchId: uuid("batch_id"),
	performedByUserId: uuid("performed_by_user_id"),
	transactionType: inventoryTransactionType("transaction_type").notNull(),
	quantityDelta: integer("quantity_delta").notNull(),
	unitOrderPriceCents: integer("unit_order_price_cents"),
	referenceType: varchar("reference_type", { length: 32 }),
	referenceId: uuid("reference_id"),
	note: text(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("inventory_transactions_batch_occurred_idx").using("btree", table.batchId.asc().nullsLast().op("timestamptz_ops"), table.occurredAt.asc().nullsLast().op("uuid_ops")),
	index("inventory_transactions_branch_product_idx").using("btree", table.branchId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops")),
	index("inventory_transactions_org_branch_type_occurred_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.branchId.asc().nullsLast().op("uuid_ops"), table.transactionType.asc().nullsLast().op("uuid_ops"), table.occurredAt.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [inventoryBatches.id],
			name: "inventory_transactions_batch_id_inventory_batches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "inventory_transactions_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "inventory_transactions_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.performedByUserId],
			foreignColumns: [users.id],
			name: "inventory_transactions_performed_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_transactions_product_id_products_id_fk"
		}).onDelete("restrict"),
]);

export const productCategories = pgTable("product_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_categories_name_trgm_idx").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	uniqueIndex("product_categories_org_name_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "product_categories_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const loyaltyAccounts = pgTable("loyalty_accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	tier: loyaltyTier().default('bronze').notNull(),
	pointsBalance: integer("points_balance").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("loyalty_accounts_patient_unique").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "loyalty_accounts_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "loyalty_accounts_patient_id_patients_id_fk"
		}).onDelete("cascade"),
]);

export const patients = pgTable("patients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	patientCode: varchar("patient_code", { length: 32 }).notNull(),
	fullName: text("full_name").notNull(),
	phone: varchar({ length: 32 }),
	email: varchar({ length: 255 }),
	dateOfBirth: date("date_of_birth"),
	gender: patientGender().default('unknown').notNull(),
	notes: text(),
	isRewardsMember: boolean("is_rewards_member").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("patients_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("patients_org_patient_code_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.patientCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "patients_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const loyaltyLedger = pgTable("loyalty_ledger", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: uuid("account_id").notNull(),
	saleId: uuid("sale_id"),
	pointsDelta: integer("points_delta").notNull(),
	reason: text().notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("loyalty_ledger_account_idx").using("btree", table.accountId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [loyaltyAccounts.id],
			name: "loyalty_ledger_account_id_loyalty_accounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "loyalty_ledger_sale_id_sales_id_fk"
		}).onDelete("set null"),
]);

export const sales = pgTable("sales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id").notNull(),
	saleNumber: varchar("sale_number", { length: 64 }).notNull(),
	patientId: uuid("patient_id"),
	prescriptionId: uuid("prescription_id"),
	servedByUserId: uuid("served_by_user_id"),
	status: saleStatus().default('draft').notNull(),
	subtotalCents: integer("subtotal_cents").default(0).notNull(),
	taxCents: integer("tax_cents").default(0).notNull(),
	discountCents: integer("discount_cents").default(0).notNull(),
	totalCents: integer("total_cents").default(0).notNull(),
	paymentStatus: paymentStatus("payment_status").default('pending').notNull(),
	discountCode: varchar("discount_code", { length: 64 }),
	notes: text(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sales_branch_created_idx").using("btree", table.branchId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("sales_org_sale_number_unique").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops"), table.saleNumber.asc().nullsLast().op("uuid_ops")),
	index("sales_patient_idx").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "sales_branch_id_branches_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "sales_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "sales_patient_id_patients_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.prescriptionId],
			foreignColumns: [prescriptions.id],
			name: "sales_prescription_id_prescriptions_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.servedByUserId],
			foreignColumns: [users.id],
			name: "sales_served_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	saleId: uuid("sale_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id").notNull(),
	method: paymentMethod().notNull(),
	status: paymentStatus().default('pending').notNull(),
	reference: varchar({ length: 128 }),
	amountCents: integer("amount_cents").notNull(),
	currency: varchar({ length: 3 }).default('USD').notNull(),
	paidAt: timestamp("paid_at", { withTimezone: true, mode: 'string' }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payments_reference_idx").using("btree", table.reference.asc().nullsLast().op("text_ops")),
	index("payments_sale_idx").using("btree", table.saleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "payments_branch_id_branches_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "payments_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "payments_sale_id_sales_id_fk"
		}).onDelete("cascade"),
]);

export const prescriptions = pgTable("prescriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id").notNull(),
	patientId: uuid("patient_id").notNull(),
	rxNumber: varchar("rx_number", { length: 64 }).notNull(),
	prescriberName: text("prescriber_name"),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	status: prescriptionStatus().default('active').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("prescriptions_org_rx_number_unique").using("btree", table.organizationId.asc().nullsLast().op("text_ops"), table.rxNumber.asc().nullsLast().op("text_ops")),
	index("prescriptions_patient_idx").using("btree", table.patientId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "prescriptions_branch_id_branches_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "prescriptions_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "prescriptions_patient_id_patients_id_fk"
		}).onDelete("restrict"),
]);

export const prescriptionItems = pgTable("prescription_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	prescriptionId: uuid("prescription_id").notNull(),
	productId: uuid("product_id"),
	dosageInstructions: text("dosage_instructions"),
	quantityPrescribed: integer("quantity_prescribed").notNull(),
	quantityDispensed: integer("quantity_dispensed").default(0).notNull(),
	refillsAuthorized: integer("refills_authorized").default(0).notNull(),
	refillsRemaining: integer("refills_remaining").default(0).notNull(),
}, (table) => [
	index("prescription_items_prescription_idx").using("btree", table.prescriptionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.prescriptionId],
			foreignColumns: [prescriptions.id],
			name: "prescription_items_prescription_id_prescriptions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "prescription_items_product_id_products_id_fk"
		}).onDelete("set null"),
]);

export const saleItems = pgTable("sale_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	saleId: uuid("sale_id").notNull(),
	productId: uuid("product_id"),
	batchId: uuid("batch_id"),
	prescriptionItemId: uuid("prescription_item_id"),
	description: text().notNull(),
	quantity: integer().notNull(),
	unitPriceCents: integer("unit_price_cents").notNull(),
	taxRateBps: integer("tax_rate_bps").default(0).notNull(),
	discountCents: integer("discount_cents").default(0).notNull(),
	lineSubtotalCents: integer("line_subtotal_cents").notNull(),
	lineTotalCents: integer("line_total_cents").notNull(),
}, (table) => [
	index("sale_items_sale_idx").using("btree", table.saleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [inventoryBatches.id],
			name: "sale_items_batch_id_inventory_batches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.prescriptionItemId],
			foreignColumns: [prescriptionItems.id],
			name: "sale_items_prescription_item_id_prescription_items_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "sale_items_product_id_products_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.saleId],
			foreignColumns: [sales.id],
			name: "sale_items_sale_id_sales_id_fk"
		}).onDelete("cascade"),
]);

export const complianceDocuments = pgTable("compliance_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	branchId: uuid("branch_id"),
	uploadedByUserId: uuid("uploaded_by_user_id"),
	documentType: documentType("document_type").notNull(),
	status: documentStatus().default('uploaded').notNull(),
	fileName: text("file_name").notNull(),
	storageKey: text("storage_key").notNull(),
	mimeType: varchar("mime_type", { length: 128 }).notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	licenseNumber: varchar("license_number", { length: 128 }),
	issuer: text(),
	issuedAt: timestamp("issued_at", { withTimezone: true, mode: 'string' }),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("compliance_documents_org_idx").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("compliance_documents_type_status_idx").using("btree", table.documentType.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "compliance_documents_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "compliance_documents_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedByUserId],
			foreignColumns: [users.id],
			name: "compliance_documents_uploaded_by_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const organizationOnboarding = pgTable("organization_onboarding", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	ownerUserId: uuid("owner_user_id"),
	mainBranchId: uuid("main_branch_id"),
	currentStep: onboardingStep("current_step").default('identity').notNull(),
	furthestStepIndex: integer("furthest_step_index").default(0).notNull(),
	status: onboardingStatus().default('draft').notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	approvedAt: timestamp("approved_at", { withTimezone: true, mode: 'string' }),
	reviewNotes: text("review_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("organization_onboarding_org_unique").using("btree", table.organizationId.asc().nullsLast().op("uuid_ops")),
	index("organization_onboarding_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.mainBranchId],
			foreignColumns: [branches.id],
			name: "organization_onboarding_main_branch_id_branches_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_onboarding_organization_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.ownerUserId],
			foreignColumns: [users.id],
			name: "organization_onboarding_owner_user_id_users_id_fk"
		}).onDelete("set null"),
]);
