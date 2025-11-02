-- Case-insensitive uniqueness: store a normalized copy
ALTER TABLE user ADD COLUMN username_norm TEXT;
UPDATE user SET username_norm = lower(trim(username)) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_username_norm ON user(username_norm);

-- Password auth fields (nullable for anonymous users)
ALTER TABLE user ADD COLUMN password_hash TEXT;     -- base64 of scrypt hash
ALTER TABLE user ADD COLUMN password_salt TEXT;     -- base64 random salt
ALTER TABLE user ADD COLUMN password_algo TEXT;     -- 'scrypt'
ALTER TABLE user ADD COLUMN password_params TEXT;   -- JSON: {N,r,p,dkLen}
ALTER TABLE user ADD COLUMN password_updated_at TEXT;

-- Optional last login
ALTER TABLE user ADD COLUMN last_login_at TEXT;
