-- Add has_error flag to reports

ALTER TABLE reports ADD COLUMN IF NOT EXISTS has_error BOOLEAN NOT NULL DEFAULT FALSE;
