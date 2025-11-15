import { Session } from './types'
import { DatabaseClient } from '../../shared/database/client'

export class SessionRepository {
  constructor(private db: DatabaseClient) {}

  async createSession(userId: string, mode: string): Promise<string> {
    const sessionId = crypto.randomUUID()

    await this.db
      .prepare('INSERT INTO run_session (id, user_id, mode) VALUES (?, ?, ?)')
      .bind(sessionId, userId, mode)
      .run()

    return sessionId
  }

  async completeSession(
    sessionId: string,
    userId: string,
    score: number,
    maxStreak: number
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE run_session
         SET score = ?, max_streak = ?, ended_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ? AND ended_at IS NULL`
      )
      .bind(score, maxStreak, sessionId, userId)
      .run()
  }

  async getUserSessions(userId: string, limit: number = 10): Promise<Session[]> {
    const results = await this.db
      .prepare(
        'SELECT * FROM run_session WHERE user_id = ? ORDER BY started_at DESC LIMIT ?'
      )
      .bind(userId, limit)
      .all<Session>()

    return results.results || []
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    return await this.db
      .prepare('SELECT * FROM run_session WHERE id = ?')
      .bind(sessionId)
      .first<Session>()
  }
}
