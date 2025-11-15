-- Migration 013: Drop legacy question table
-- This migration removes the old question table in favor of the new
-- question_base + question_translation structure.
--
-- IMPORTANT: Ensure all data has been migrated to the new structure
-- before running this migration in production.

-- Drop indexes first
DROP INDEX IF EXISTS q_idx;
DROP INDEX IF EXISTS q_lang_cat_diff;
DROP INDEX IF EXISTS q_verified_recent;

-- Drop the legacy question table
DROP TABLE IF EXISTS question;

-- Add composite index for better JOIN performance
-- (if not already exists from previous migrations)
CREATE INDEX IF NOT EXISTS qt_lang_base ON question_translation(lang, base_id);
