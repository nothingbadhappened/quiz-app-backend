-- Fix all incorrect correct_idx values in question_translation table
-- The OpenAI generator was using 1-based indexing, but the frontend/backend expect 0-based
-- This migration:
-- 1. Creates a new table without the CHECK constraint (>= 1)
-- 2. Migrates all data with correct_idx converted to 0-based (idx - 1)
-- 3. Drops the old table
-- 4. Renames the new table

-- Step 1: Create new table with 0-based indexing constraint
CREATE TABLE IF NOT EXISTS question_translation_new (
  base_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_idx INTEGER NOT NULL CHECK (correct_idx >= 0), -- 0-based indexing
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (base_id, lang),
  FOREIGN KEY (base_id) REFERENCES question_base(id) ON DELETE CASCADE
);

-- Step 2: Copy all data with correct_idx converted from 1-based to 0-based
INSERT INTO question_translation_new (base_id, lang, prompt, options, correct_idx, created_at)
SELECT base_id, lang, prompt, options, correct_idx - 1, created_at
FROM question_translation;

-- Step 3: Drop old table
DROP TABLE question_translation;

-- Step 4: Rename new table
ALTER TABLE question_translation_new RENAME TO question_translation;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS qt_lang ON question_translation(lang);
