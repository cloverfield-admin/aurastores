-- Account deletion with a 30-day grace period. When a user requests deletion,
-- `users.deletion_scheduled_at` is stamped 30 days out; if the requester is the
-- org owner, `organizations.deletion_scheduled_at` is stamped too so the whole
-- store is purged. Both are cleared to NULL if the user cancels within the grace
-- window. The aurestores-engine sets/clears these and runs the daily purge sweep.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_scheduled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deletion_scheduled_at" timestamp with time zone;
