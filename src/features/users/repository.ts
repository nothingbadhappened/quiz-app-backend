import { User } from '../../shared/database/types'
import { DatabaseClient } from '../../shared/database/client'

export class UserRepository {
  constructor(private db: DatabaseClient) {}

  async createUser(
    id: string,
    username: string,
    usernameNorm: string,
    locale: string
  ): Promise<void> {
    await this.db
      .prepare(
        'INSERT INTO user (id, username, username_norm, locale) VALUES (?, ?, ?, ?)'
      )
      .bind(id, username, usernameNorm, locale)
      .run()
  }

  async findById(id: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM user WHERE id = ?')
      .bind(id)
      .first<User>()
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.db
      .prepare('SELECT * FROM user WHERE username_norm = ?')
      .bind(username.toLowerCase())
      .first<User>()
  }

  async usernameExists(usernameNorm: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT id FROM user WHERE username_norm = ?')
      .bind(usernameNorm)
      .first<{ id: string }>()
    return !!result
  }

  async getUserProfile(userId: string): Promise<{
    id: string
    username: string
    locale: string
    last_login_at?: string
  } | null> {
    return await this.db
      .prepare('SELECT id, username, locale, last_login_at FROM user WHERE id = ?')
      .bind(userId)
      .first()
  }
}
