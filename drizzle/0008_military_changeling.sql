CREATE INDEX "inventory_batches_org_branch_created_idx" ON "inventory_batches" USING btree ("organization_id","branch_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_batches_branch_product_lower_batch_idx" ON "inventory_batches" USING btree ("branch_id","product_id",lower("batch_number"));--> statement-breakpoint
CREATE INDEX "product_categories_org_lower_name_idx" ON "product_categories" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE INDEX "products_org_lower_name_idx" ON "products" USING btree ("organization_id",lower("name"));--> statement-breakpoint
CREATE INDEX "suppliers_org_lower_name_idx" ON "suppliers" USING btree ("organization_id",lower("name"));