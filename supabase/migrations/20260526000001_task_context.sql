-- Background context captured from voice input, used to seed subtask generation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS context TEXT;
