-- Rename legacy `settings` capability flag to `organization` in stored JSON.
UPDATE "organization_memberships"
SET "capabilities" = CASE
  WHEN "capabilities" IS NULL THEN NULL
  WHEN "capabilities" ? 'organization' THEN "capabilities" - 'settings'
  WHEN "capabilities" ? 'settings' THEN ("capabilities" - 'settings')
    || jsonb_build_object('organization', "capabilities"->'settings')
  ELSE "capabilities"
END
WHERE "capabilities" IS NOT NULL AND "capabilities" ? 'settings';
--> statement-breakpoint
UPDATE "staff_invitations"
SET "capabilities" = CASE
  WHEN "capabilities" IS NULL THEN NULL
  WHEN "capabilities" ? 'organization' THEN "capabilities" - 'settings'
  WHEN "capabilities" ? 'settings' THEN ("capabilities" - 'settings')
    || jsonb_build_object('organization', "capabilities"->'settings')
  ELSE "capabilities"
END
WHERE "capabilities" IS NOT NULL AND "capabilities" ? 'settings';
