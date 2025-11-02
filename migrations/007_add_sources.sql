-- Add columns one-by-one (SQLite/D1 limitation)
ALTER TABLE question ADD COLUMN source_urls   TEXT NOT NULL DEFAULT '[]';
ALTER TABLE question ADD COLUMN source_titles TEXT NOT NULL DEFAULT '[]';
ALTER TABLE question ADD COLUMN region        TEXT NOT NULL DEFAULT 'global';
ALTER TABLE question ADD COLUMN verified      INTEGER NOT NULL DEFAULT 0;

-- Helpful indexes (no expression casts in D1 indexes)
CREATE INDEX IF NOT EXISTS q_lang_cat_diff  ON question(lang, category, difficulty, region);
CREATE INDEX IF NOT EXISTS q_verified_recent ON question(verified, created_at);
