-- Neutral branch staffing columns (data unchanged; semantics generalize per store_vertical).
ALTER TABLE "branches" RENAME COLUMN "licensed_pharmacist_count" TO "professional_staff_count";
ALTER TABLE "branches" RENAME COLUMN "lead_pharmacist_user_id" TO "lead_staff_user_id";
