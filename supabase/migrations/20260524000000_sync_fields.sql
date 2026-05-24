-- Add theme, categories, spin_count to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'warm-start';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT ARRAY['Work','Personal','Learning','Health']::TEXT[];
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS spin_count INTEGER NOT NULL DEFAULT 0;

-- parent_task_id so subtasks know which task they belong to
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id TEXT;

-- Rest days — persisted so they survive device switches
CREATE TABLE IF NOT EXISTS rest_days (
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE    NOT NULL,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  partial_pct INTEGER,         -- 0-100, NULL when fully complete
  PRIMARY KEY (user_id, date)
);

ALTER TABLE rest_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own rest days"
  ON rest_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
