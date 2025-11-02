-- base tables
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  username TEXT UNIQUE,
  locale TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS question (
  id TEXT PRIMARY KEY,
  lang TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL,        -- JSON array string: ["A","B","C","D"]
  correct_idx INTEGER NOT NULL, -- 1..N
  normalized_hash TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_answer (
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  correct INTEGER NOT NULL,     -- 0/1
  answered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS q_idx ON question(lang, category, CAST(difficulty AS INTEGER), created_at);
