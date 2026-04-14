ALTER TABLE "product_categories"
ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
--> statement-breakpoint

DROP INDEX IF EXISTS "product_categories_org_name_unique";
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "product_categories_org_lower_name_active_unique"
ON "product_categories" USING btree ("organization_id", lower("name"))
WHERE "archived_at" IS NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "product_categories_org_archived_lower_name_idx"
ON "product_categories" USING btree ("organization_id", "archived_at", lower("name"));
