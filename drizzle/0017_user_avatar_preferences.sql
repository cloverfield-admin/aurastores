ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_storage_key" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" jsonb;
