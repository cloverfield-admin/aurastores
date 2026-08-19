-- Freeze the cost of goods onto the sale line at sale time.
--
-- COGS was recomputed on every dashboard load by joining `sale_items.batch_id`
-- back to `inventory_batches` and reading its *current* `unit_order_price_cents`.
-- That makes reported profit a function of today's inventory rather than of what
-- actually happened: correcting a batch's cost silently rewrites the profit of
-- every sale that ever drew from it, and because `batch_id` is ON DELETE SET
-- NULL, removing a batch drops those sales out of the COGS join entirely and
-- reports their full selling price as profit.
--
-- The cost is already known at write time (it is what the stock decrement is
-- priced at, and it is already recorded on the matching `inventory_transactions`
-- row) — it was simply never stored on the sale.
--
-- Nullable on purpose: NULL means "written before this column existed", and
-- readers COALESCE to the batch join for those rows. New writes always populate
-- it, so the null set is closed and shrinks to irrelevance as history ages out.
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "unit_order_price_cents" integer;
--> statement-breakpoint
-- Backfill from the batches as they stand today. This is the same value the old
-- join would have produced for these rows, so no reported figure moves — it just
-- stops being able to drift from here on.
UPDATE "sale_items" AS si
SET "unit_order_price_cents" = b."unit_order_price_cents"
FROM "inventory_batches" AS b
WHERE b."id" = si."batch_id" AND si."unit_order_price_cents" IS NULL;
