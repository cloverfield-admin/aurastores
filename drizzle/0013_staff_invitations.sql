CREATE TYPE "staff_invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "staff_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invited_by_user_id" uuid,
	"email" varchar(255) NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"app_role" "app_role" NOT NULL,
	"job_title" varchar(128),
	"branch_ids" jsonb NOT NULL,
	"status" "staff_invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"auth_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "staff_invitations_org_idx" ON "staff_invitations" ("organization_id");
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "staff_invitations_org_email_pending_unique" ON "staff_invitations" ("organization_id", lower("email")) WHERE "status" = 'pending';
