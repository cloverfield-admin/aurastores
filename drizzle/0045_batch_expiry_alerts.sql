-- Tracks which inventory batches the aurestores-engine has already sent an
-- expiry alert for, so a batch nearing expiry is notified exactly ONCE instead
-- of every day it sits inside the 30-day window. The engine inserts a row when
-- it alerts (ON CONFLICT (batch_id) DO NOTHING) and its expiry sweep excludes
-- any batch already present here. Schema owned here; written by the engine.
CREATE TABLE IF NOT EXISTS "batch_expiry_alerts" (
	"batch_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"expires_at" date NOT NULL,
	"notified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "batch_expiry_alerts_branch_idx" ON "batch_expiry_alerts" ("branch_id");
