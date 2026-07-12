-- Custom habits can now carry the same icon + colour picker tasks use;
-- persist both so they survive a cross-device sync instead of falling
-- back to the category colour on reload.
ALTER TABLE rest_tasks ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE rest_tasks ADD COLUMN IF NOT EXISTS icon TEXT;
