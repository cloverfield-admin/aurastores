-- Stock dashboard: branch-scoped batch filters and 30-day sales rollup.
CREATE INDEX IF NOT EXISTS inventory_batches_org_branch_expiry_idx
  ON inventory_batches (organization_id, branch_id, expires_at);

CREATE INDEX IF NOT EXISTS inventory_transactions_org_branch_type_occurred_idx
  ON inventory_transactions (organization_id, branch_id, transaction_type, occurred_at);
