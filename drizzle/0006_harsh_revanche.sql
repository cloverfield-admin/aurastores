CREATE INDEX IF NOT EXISTS "inventory_batches_org_branch_product_status_expiry_idx"
  ON "inventory_batches" USING btree ("organization_id","branch_id","product_id","status","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_org_name_idx"
  ON "products" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_org_phone_idx"
  ON "patients" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_org_branch_status_created_idx"
  ON "sales" USING btree ("organization_id","branch_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_org_status_branch_idx"
  ON "sales" USING btree ("organization_id","status","branch_id");