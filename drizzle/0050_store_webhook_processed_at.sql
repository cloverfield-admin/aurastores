-- store_webhook_events tracked RECEIPT, and the engine read it as APPLICATION.
--
-- ProcessWebhook inserted the event before applying it, so the moment an event
-- failed to apply — most commonly the webhook arriving before the app's sync call
-- had linked the RevenueCat customer to an org — RevenueCat's retry found the row
-- already present, concluded "already applied", and acked. The purchase was then
-- lost permanently: a row in this table, and no change to organization_subscriptions.
--
-- processed_at splits the two states. The row is written on receipt; the stamp goes
-- on only once the event has actually landed on the subscription. A redelivery of an
-- applied event stays a no-op; a redelivery of an unapplied one re-applies.
ALTER TABLE "store_webhook_events" ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;--> statement-breakpoint

-- Backfill: every event that predates this column was, by the old code path, either
-- applied or silently swallowed — and the two are indistinguishable in this table.
-- Stamp them all processed rather than replaying history: RevenueCat has long since
-- stopped retrying them, so an unstamped row would never be redelivered anyway, and
-- leaving them NULL would only misreport them as "pending" forever.
--
-- Purchases stranded by the old bug are recovered by the app's next sync call, which
-- activates the plan from RevenueCat's current entitlement state, not from this log.
UPDATE "store_webhook_events" SET "processed_at" = "created_at" WHERE "processed_at" IS NULL;--> statement-breakpoint

-- Partial index: the only query that reads this column looks for stuck events
-- (processed_at IS NULL), which is a tiny minority of the table.
CREATE INDEX IF NOT EXISTS "store_webhook_events_unprocessed_idx" ON "store_webhook_events" USING btree ("created_at") WHERE "processed_at" IS NULL;
