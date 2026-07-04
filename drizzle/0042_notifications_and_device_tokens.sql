-- Notifications + device tokens for the aurestores-engine service.
--
-- The engine (a separate Go service) writes these tables; the schema is owned
-- here. RLS is enabled so Supabase Realtime can stream a user's own new
-- notifications to the web/mobile in-app inbox. The engine connects as the
-- table owner (bypasses RLS); clients never write these tables directly.

CREATE TABLE notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              varchar(64) NOT NULL,
  category          varchar(24) NOT NULL,
  title             text NOT NULL,
  body              text NOT NULL,
  data              jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key        varchar(255),
  read_at           timestamp with time zone,
  created_at        timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_created_idx
  ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX notifications_recipient_unread_idx
  ON notifications (recipient_user_id) WHERE read_at IS NULL;

-- Idempotency guard: at most one row per (recipient, dedupe_key) when set.
CREATE UNIQUE INDEX notifications_recipient_dedupe_unique
  ON notifications (recipient_user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE INDEX notifications_org_idx ON notifications (organization_id);

CREATE TABLE device_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        text NOT NULL,
  platform     varchar(10) NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at   timestamp with time zone NOT NULL DEFAULT now(),
  updated_at   timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX device_tokens_token_unique ON device_tokens (token);
CREATE INDEX device_tokens_user_idx ON device_tokens (user_id);

-- Row-level security -------------------------------------------------------

-- Notifications: a signed-in user may read only their own rows. This both
-- gates Supabase Realtime delivery and protects any direct client reads. No
-- INSERT/UPDATE policy for clients — only the engine (table owner) writes.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- Device tokens are sensitive and never read by clients directly (they go
-- through the engine API). Enable RLS with no client policy: anon/authenticated
-- roles get no access; the engine (table owner) bypasses RLS.
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Realtime: publish notifications so subscribed clients receive new rows live.
-- Guarded so re-running is a no-op and it never fails if the publication is
-- absent (e.g. a non-Supabase local Postgres).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END IF;
END
$$;
