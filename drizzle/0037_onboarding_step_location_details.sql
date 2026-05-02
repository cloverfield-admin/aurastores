-- Rename onboarding step pharmacy_details -> location_details (enum swap).
CREATE TYPE "onboarding_step__new" AS ENUM ('identity', 'location_details', 'license', 'review');

ALTER TABLE "organization_onboarding" ALTER COLUMN "current_step" DROP DEFAULT;

ALTER TABLE "organization_onboarding"
  ALTER COLUMN "current_step" TYPE "onboarding_step__new"
  USING (
    CASE "current_step"::text
      WHEN 'pharmacy_details' THEN 'location_details'
      ELSE "current_step"::text
    END
  )::"onboarding_step__new";

ALTER TABLE "organization_onboarding"
  ALTER COLUMN "current_step" SET DEFAULT 'identity'::"onboarding_step__new";

DROP TYPE "onboarding_step";
ALTER TYPE "onboarding_step__new" RENAME TO "onboarding_step";
