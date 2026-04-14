-- Ensure owner/admin users have an active branch_staff_assignment for every branch in their org.
-- The app scopes the UI and APIs by these rows; remove rows for a user/branch if that user
-- should not see that branch (there is no separate implicit org-wide mode when no rows match).
INSERT INTO "branch_staff_assignments" ("id", "branch_id", "user_id", "role", "status", "is_lead", "assigned_at")
SELECT gen_random_uuid(), b."id", om."user_id", om."role", 'active', false, now()
FROM "organization_memberships" om
INNER JOIN "branches" b ON b."organization_id" = om."organization_id"
WHERE om."role" IN ('owner', 'admin')
  AND om."status" IN ('active', 'invited')
  AND NOT EXISTS (
    SELECT 1
    FROM "branch_staff_assignments" bsa
    WHERE bsa."user_id" = om."user_id"
      AND bsa."branch_id" = b."id"
      AND bsa."unassigned_at" IS NULL
  );
