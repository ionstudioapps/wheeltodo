-- calendar_event_id on tasks so each task can map to a Google Calendar event
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Stores OAuth tokens per user per provider (initially just 'google')
CREATE TABLE IF NOT EXISTS calendar_connections (
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider         TEXT        NOT NULL,  -- 'google'
  access_token     TEXT        NOT NULL,
  refresh_token    TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id      TEXT        NOT NULL DEFAULT 'primary',
  last_synced_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own calendar connections"
  ON calendar_connections FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
