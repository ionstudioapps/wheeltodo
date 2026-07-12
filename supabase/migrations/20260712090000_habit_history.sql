-- Per-day habit completion history, so tracked habits (a Bloom cloud-sync
-- feature) survive device changes. `day` stores Date#toDateString strings to
-- match the clients' local habitHistory state.
CREATE TABLE IF NOT EXISTS habit_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (user_id, habit_id, day)
);

ALTER TABLE habit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own habit history" ON habit_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
