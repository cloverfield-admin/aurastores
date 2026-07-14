-- Platform-admin audit trail.
--
-- Every `aurastores_admin` mutation (edit a company, change its plan, suspend it,
-- disable a user, start an impersonation session) writes exactly ONE row here, in
-- the SAME transaction as the mutation it records. These are cross-tenant,
-- destructive powers and this table is their only paper trail.
--
-- Actor/target identity is DENORMALIZED (actor_email, target_organization_name,
-- target_user_email) on purpose. The daily account-purge sweep hard-DELETEs users
-- and organizations, and the FKs below are ON DELETE SET NULL — without the text
-- snapshots, purging a store would erase the record of who deleted it. The FK
-- still gives you a live link while the row exists; the snapshot survives it.
--
-- `action` / `target_type` are varchar rather than new pg enums: adding an action
-- would otherwise need an ALTER TYPE every time, and the engine compares them as
-- strings anyway. `payload_before` / `payload_after` rather than before/after
-- because BEFORE is a reserved word in Postgres.
CREATE TABLE IF NOT EXISTS "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_email" varchar(255) DEFAULT '' NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"target_organization_id" uuid,
	"target_organization_name" text DEFAULT '' NOT NULL,
	"target_user_id" uuid,
	"target_user_email" varchar(255) DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"payload_before" jsonb,
	"payload_after" jsonb,
	"correlation_id" varchar(64) DEFAULT '' NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_organization_id_organizations_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- The log is read newest-first, either whole or filtered by actor / target org /
-- action. Every index is (filter, created_at DESC) so the filter and the keyset
-- page are served by one scan.
CREATE INDEX IF NOT EXISTS "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_log_actor_created_idx" ON "admin_audit_log" USING btree ("actor_user_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_log_target_org_created_idx" ON "admin_audit_log" USING btree ("target_organization_id","created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_log_action_created_idx" ON "admin_audit_log" USING btree ("action","created_at" DESC);
