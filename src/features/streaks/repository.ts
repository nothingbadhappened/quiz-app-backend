import { StreakState } from './types'
import { DatabaseClient } from '../../shared/database/client'

export class StreakRepository {
  constructor(private db: DatabaseClient) {}

  async getStreak(userId: string): Promise<StreakState | null> {
    return await this.db
      .prepare('SELECT current_streak, best_streak, updated_at FROM streak_state WHERE user_id = ?')
      .bind(userId)
      .first<StreakState>()
  }

  async updateStreak(userId: string, currentStreak: number, bestStreak: number): Promise<void> {
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO streak_state (user_id, current_streak, best_streak, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .bind(userId, currentStreak, bestStreak)
      .run()
  }

  async initializeStreak(userId: string): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO streak_state (user_id, current_streak, best_streak) VALUES (?, 0, 0)'
      )
      .bind(userId)
      .run()
  }
}
