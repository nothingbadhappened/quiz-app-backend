-- adaptive skill
CREATE TABLE IF NOT EXISTS user_skill (
  user_id TEXT PRIMARY KEY,
  mu REAL NOT NULL DEFAULT 3.0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- sessions
CREATE TABLE IF NOT EXISTS run_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('run','endless','daily')),
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  score INTEGER DEFAULT 0,
  lives_used INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0
);

-- streaks
CREATE TABLE IF NOT EXISTS streak_state (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- topic preferences
CREATE TABLE IF NOT EXISTS topic_pref (
  user_id TEXT,
  topic TEXT,
  weight REAL DEFAULT 0.0,
  PRIMARY KEY (user_id, topic)
);
