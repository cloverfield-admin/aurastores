ALTER TABLE "organization_memberships" ADD COLUMN IF NOT EXISTS "capabilities" jsonb;
--> statement-breakpoint
ALTER TABLE "staff_invitations" ADD COLUMN IF NOT EXISTS "capabilities" jsonb;
--> statement-breakpoint

UPDATE "organization_memberships"
SET "capabilities" = CASE "role"::text
  WHEN 'owner' THEN '{"stock":true,"sales":true,"insights":true,"catalog":true,"staff":true,"pay":true,"settings":true}'::jsonb
  WHEN 'admin' THEN '{"stock":true,"sales":true,"insights":true,"catalog":true,"staff":true,"pay":true,"settings":true}'::jsonb
  WHEN 'pharmacist' THEN '{"stock":true,"sales":true,"insights":true,"catalog":true,"staff":false,"pay":false,"settings":false}'::jsonb
  WHEN 'manager' THEN '{"stock":true,"sales":true,"insights":true,"catalog":true,"staff":false,"pay":false,"settings":false}'::jsonb
  WHEN 'cashier' THEN '{"stock":true,"sales":true,"insights":false,"catalog":false,"staff":false,"pay":false,"settings":false}'::jsonb
  WHEN 'analyst' THEN '{"stock":false,"sales":false,"insights":true,"catalog":true,"staff":false,"pay":false,"settings":false}'::jsonb
  ELSE '{"stock":true,"sales":true,"insights":true,"catalog":true,"staff":false,"pay":false,"settings":false}'::jsonb
END
WHERE "capabilities" IS NULL;
--> statement-breakpoint

INSERT INTO "branch_staff_assignments" ("id", "branch_id", "user_id", "role", "status", "is_lead", "assigned_at")
SELECT gen_random_uuid(), sub.branch_id, sub.user_id, sub.membership_role, 'active', false, now()
FROM (
  SELECT DISTINCT ON (om."id")
    om."user_id" AS user_id,
    om."role" AS membership_role,
    b."id" AS branch_id
  FROM "organization_memberships" om
  INNER JOIN "branches" b ON b."organization_id" = om."organization_id"
  WHERE om."status" IN ('active', 'invited')
  ORDER BY om."id", b."is_primary" DESC, b."name" ASC
) AS sub
WHERE NOT EXISTS (
  SELECT 1
  FROM "branch_staff_assignments" bsa
  WHERE bsa."user_id" = sub.user_id
    AND bsa."branch_id" = sub.branch_id
    AND bsa."unassigned_at" IS NULL
);
