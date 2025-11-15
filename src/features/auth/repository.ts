import { User } from '../../shared/database/types'
import { DatabaseClient } from '../../shared/database/client'

export class AuthRepository {
  constructor(private db: DatabaseClient) {}

  async findUserByUsername(usernameNorm: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM user WHERE username_norm = ?')
      .bind(usernameNorm)
      .first<User>()
  }

  async createUserWithPassword(
    id: string,
    username: string,
    usernameNorm: string,
    locale: string,
    hashB64: string,
    saltB64: string,
    algo: string,
    params: string
  ): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO user (id, username, username_norm, locale, password_hash, password_salt, password_algo, password_params, password_updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
        )
        .bind(id, username, usernameNorm, locale, hashB64, saltB64, algo, params),
      this.db
        .prepare('INSERT OR IGNORE INTO user_skill (user_id, mu) VALUES (?, 3.0)')
        .bind(id),
      this.db
        .prepare(
          'INSERT OR IGNORE INTO streak_state (user_id, current_streak, best_streak) VALUES (?, 0, 0)'
        )
        .bind(id),
    ])
  }

  async updatePassword(
    userId: string,
    hashB64: string,
    saltB64: string,
    algo: string,
    params: string
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE user
         SET password_hash = ?, password_salt = ?, password_algo = ?, password_params = ?, password_updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(hashB64, saltB64, algo, params, userId)
      .run()
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db
      .prepare('UPDATE user SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(userId)
      .run()
  }

  async findById(userId: string): Promise<{
    id: string
    username: string
    locale: string
    last_login_at: string | null
  } | null> {
    return await this.db
      .prepare('SELECT id, username, locale, last_login_at FROM user WHERE id = ?')
      .bind(userId)
      .first()
  }
}
