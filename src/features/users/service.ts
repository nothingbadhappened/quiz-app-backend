import { UserRepository } from './repository'
import { DatabaseClient } from '../../shared/database/client'
import { normalizeUsername } from '../../shared/utils/validation'
import { APP_CONFIG } from '../../config/constants'

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private db: DatabaseClient
  ) {}

  async createUser(
    requestedUsername: string | undefined,
    locale: string = 'en',
    isGuest: boolean = false
  ): Promise<{ userId: string; username: string }> {
    const id = crypto.randomUUID()
    let username = requestedUsername || `Guest_${id.slice(0, 8)}`
    const usernameNorm = normalizeUsername(username)

    // Try to create user with username collision handling
    let attempts = 0

    while (attempts < APP_CONFIG.MAX_REGISTRATION_ATTEMPTS) {
      try {
        // Batch insert user + skill + streak
        await this.db.batch([
          this.db
            .prepare('INSERT INTO user (id, username, username_norm, locale) VALUES (?, ?, ?, ?)')
            .bind(id, username, usernameNorm, locale),
          this.db
            .prepare('INSERT OR IGNORE INTO user_skill (user_id, mu) VALUES (?, 3.0)')
            .bind(id),
          this.db
            .prepare(
              'INSERT OR IGNORE INTO streak_state (user_id, current_streak, best_streak) VALUES (?, 0, 0)'
            )
            .bind(id),
        ])

        return { userId: id, username }
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed: user.username')) {
          attempts++
          username = `${requestedUsername || 'Guest'}_${Math.random().toString(36).substring(2, 8)}`
          if (attempts >= APP_CONFIG.MAX_REGISTRATION_ATTEMPTS) {
            throw new Error('Could not generate unique username')
          }
        } else {
          throw e
        }
      }
    }

    throw new Error('Could not create user')
  }

  async getUserProfile(userId: string) {
    return this.userRepo.getUserProfile(userId)
  }
}
