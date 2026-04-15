ALTER TABLE "organization_memberships"
ADD COLUMN IF NOT EXISTS "staff_employee_code" varchar(32);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "organization_memberships_org_staff_code_unique"
ON "organization_memberships" ("organization_id", "staff_employee_code")
WHERE "staff_employee_code" IS NOT NULL;
