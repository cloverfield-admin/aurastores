import { relations } from "drizzle-orm/relations";
import { organizations, organizationMemberships, users, branches, branchOperatingHours, branchStaffAssignments, inventoryBatches, products, suppliers, productCategories, inventoryTransactions, loyaltyAccounts, patients, loyaltyLedger, sales, prescriptions, payments, prescriptionItems, saleItems, complianceDocuments, organizationOnboarding } from "./schema";

export const organizationMembershipsRelations = relations(organizationMemberships, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMemberships.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationMemberships.userId],
		references: [users.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	organizationMemberships: many(organizationMemberships),
	branches: many(branches),
	inventoryBatches: many(inventoryBatches),
	products: many(products),
	suppliers: many(suppliers),
	inventoryTransactions: many(inventoryTransactions),
	productCategories: many(productCategories),
	loyaltyAccounts: many(loyaltyAccounts),
	patients: many(patients),
	sales: many(sales),
	payments: many(payments),
	prescriptions: many(prescriptions),
	complianceDocuments: many(complianceDocuments),
	organizationOnboardings: many(organizationOnboarding),
}));

export const usersRelations = relations(users, ({many}) => ({
	organizationMemberships: many(organizationMemberships),
	branches: many(branches),
	branchStaffAssignments: many(branchStaffAssignments),
	inventoryTransactions: many(inventoryTransactions),
	sales: many(sales),
	complianceDocuments: many(complianceDocuments),
	organizationOnboardings: many(organizationOnboarding),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	user: one(users, {
		fields: [branches.leadPharmacistUserId],
		references: [users.id]
	}),
	organization: one(organizations, {
		fields: [branches.organizationId],
		references: [organizations.id]
	}),
	branchOperatingHours: many(branchOperatingHours),
	branchStaffAssignments: many(branchStaffAssignments),
	inventoryBatches: many(inventoryBatches),
	inventoryTransactions: many(inventoryTransactions),
	sales: many(sales),
	payments: many(payments),
	prescriptions: many(prescriptions),
	complianceDocuments: many(complianceDocuments),
	organizationOnboardings: many(organizationOnboarding),
}));

export const branchOperatingHoursRelations = relations(branchOperatingHours, ({one}) => ({
	branch: one(branches, {
		fields: [branchOperatingHours.branchId],
		references: [branches.id]
	}),
}));

export const branchStaffAssignmentsRelations = relations(branchStaffAssignments, ({one}) => ({
	branch: one(branches, {
		fields: [branchStaffAssignments.branchId],
		references: [branches.id]
	}),
	user: one(users, {
		fields: [branchStaffAssignments.userId],
		references: [users.id]
	}),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({one, many}) => ({
	branch: one(branches, {
		fields: [inventoryBatches.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [inventoryBatches.organizationId],
		references: [organizations.id]
	}),
	product: one(products, {
		fields: [inventoryBatches.productId],
		references: [products.id]
	}),
	supplier: one(suppliers, {
		fields: [inventoryBatches.supplierId],
		references: [suppliers.id]
	}),
	inventoryTransactions: many(inventoryTransactions),
	saleItems: many(saleItems),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	inventoryBatches: many(inventoryBatches),
	productCategory: one(productCategories, {
		fields: [products.categoryId],
		references: [productCategories.id]
	}),
	organization: one(organizations, {
		fields: [products.organizationId],
		references: [organizations.id]
	}),
	inventoryTransactions: many(inventoryTransactions),
	prescriptionItems: many(prescriptionItems),
	saleItems: many(saleItems),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	inventoryBatches: many(inventoryBatches),
	organization: one(organizations, {
		fields: [suppliers.organizationId],
		references: [organizations.id]
	}),
}));

export const productCategoriesRelations = relations(productCategories, ({one, many}) => ({
	products: many(products),
	organization: one(organizations, {
		fields: [productCategories.organizationId],
		references: [organizations.id]
	}),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one}) => ({
	inventoryBatch: one(inventoryBatches, {
		fields: [inventoryTransactions.batchId],
		references: [inventoryBatches.id]
	}),
	branch: one(branches, {
		fields: [inventoryTransactions.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [inventoryTransactions.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [inventoryTransactions.performedByUserId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [inventoryTransactions.productId],
		references: [products.id]
	}),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({one, many}) => ({
	organization: one(organizations, {
		fields: [loyaltyAccounts.organizationId],
		references: [organizations.id]
	}),
	patient: one(patients, {
		fields: [loyaltyAccounts.patientId],
		references: [patients.id]
	}),
	loyaltyLedgers: many(loyaltyLedger),
}));

export const patientsRelations = relations(patients, ({one, many}) => ({
	loyaltyAccounts: many(loyaltyAccounts),
	organization: one(organizations, {
		fields: [patients.organizationId],
		references: [organizations.id]
	}),
	sales: many(sales),
	prescriptions: many(prescriptions),
}));

export const loyaltyLedgerRelations = relations(loyaltyLedger, ({one}) => ({
	loyaltyAccount: one(loyaltyAccounts, {
		fields: [loyaltyLedger.accountId],
		references: [loyaltyAccounts.id]
	}),
	sale: one(sales, {
		fields: [loyaltyLedger.saleId],
		references: [sales.id]
	}),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	loyaltyLedgers: many(loyaltyLedger),
	branch: one(branches, {
		fields: [sales.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [sales.organizationId],
		references: [organizations.id]
	}),
	patient: one(patients, {
		fields: [sales.patientId],
		references: [patients.id]
	}),
	prescription: one(prescriptions, {
		fields: [sales.prescriptionId],
		references: [prescriptions.id]
	}),
	user: one(users, {
		fields: [sales.servedByUserId],
		references: [users.id]
	}),
	payments: many(payments),
	saleItems: many(saleItems),
}));

export const prescriptionsRelations = relations(prescriptions, ({one, many}) => ({
	sales: many(sales),
	branch: one(branches, {
		fields: [prescriptions.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [prescriptions.organizationId],
		references: [organizations.id]
	}),
	patient: one(patients, {
		fields: [prescriptions.patientId],
		references: [patients.id]
	}),
	prescriptionItems: many(prescriptionItems),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	branch: one(branches, {
		fields: [payments.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [payments.organizationId],
		references: [organizations.id]
	}),
	sale: one(sales, {
		fields: [payments.saleId],
		references: [sales.id]
	}),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({one, many}) => ({
	prescription: one(prescriptions, {
		fields: [prescriptionItems.prescriptionId],
		references: [prescriptions.id]
	}),
	product: one(products, {
		fields: [prescriptionItems.productId],
		references: [products.id]
	}),
	saleItems: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({one}) => ({
	inventoryBatch: one(inventoryBatches, {
		fields: [saleItems.batchId],
		references: [inventoryBatches.id]
	}),
	prescriptionItem: one(prescriptionItems, {
		fields: [saleItems.prescriptionItemId],
		references: [prescriptionItems.id]
	}),
	product: one(products, {
		fields: [saleItems.productId],
		references: [products.id]
	}),
	sale: one(sales, {
		fields: [saleItems.saleId],
		references: [sales.id]
	}),
}));

export const complianceDocumentsRelations = relations(complianceDocuments, ({one}) => ({
	branch: one(branches, {
		fields: [complianceDocuments.branchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [complianceDocuments.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [complianceDocuments.uploadedByUserId],
		references: [users.id]
	}),
}));

export const organizationOnboardingRelations = relations(organizationOnboarding, ({one}) => ({
	branch: one(branches, {
		fields: [organizationOnboarding.mainBranchId],
		references: [branches.id]
	}),
	organization: one(organizations, {
		fields: [organizationOnboarding.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationOnboarding.ownerUserId],
		references: [users.id]
	}),
}));