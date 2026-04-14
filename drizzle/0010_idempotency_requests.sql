CREATE TABLE IF NOT EXISTS idempotency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  scope varchar(128) NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  request_hash varchar(64) NOT NULL,
  response_status integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_requests_org_scope_key_unique
  ON idempotency_requests (organization_id, scope, idempotency_key);

CREATE INDEX IF NOT EXISTS idempotency_requests_org_created_idx
  ON idempotency_requests (organization_id, created_at);
