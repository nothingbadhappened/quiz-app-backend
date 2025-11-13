-- Optimized question structure with translations
-- Base question (language-agnostic metadata)
CREATE TABLE IF NOT EXISTS question_base (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 6),
  region TEXT NOT NULL DEFAULT 'global',
  source_urls TEXT NOT NULL DEFAULT '[]',
  source_titles TEXT NOT NULL DEFAULT '[]',
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Question translations (language-specific text)
CREATE TABLE IF NOT EXISTS question_translation (
  base_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,        -- JSON array string: ["A","B","C","D"]
  correct_idx INTEGER NOT NULL CHECK (correct_idx >= 1), -- 1..N (1-based)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (base_id, lang),
  FOREIGN KEY (base_id) REFERENCES question_base(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS qb_cat_diff_region ON question_base(category, difficulty, region);
CREATE INDEX IF NOT EXISTS qb_verified ON question_base(verified, created_at);
CREATE INDEX IF NOT EXISTS qt_lang ON question_translation(lang);

-- Migration strategy: Keep existing question table for backward compatibility
-- New questions will use question_base + question_translation
-- Old queries will continue to work with existing question table
