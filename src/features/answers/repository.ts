import { Answer } from './types'
import { DatabaseClient } from '../../shared/database/client'

export class AnswerRepository {
  constructor(private db: DatabaseClient) {}

  async recordAnswer(userId: string, questionId: string, correct: boolean): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO user_answer (user_id, question_id, correct) VALUES (?, ?, ?)'
      )
      .bind(userId, questionId, correct ? 1 : 0)
      .run()
  }

  async getUserAnswers(userId: string, limit?: number): Promise<Answer[]> {
    const query = limit
      ? this.db
          .prepare('SELECT * FROM user_answer WHERE user_id = ? LIMIT ?')
          .bind(userId, limit)
      : this.db.prepare('SELECT * FROM user_answer WHERE user_id = ?').bind(userId)

    const results = await query.all<Answer>()
    return results.results || []
  }

  async hasAnswered(userId: string, questionId: string): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT 1 FROM user_answer WHERE user_id = ? AND question_id = ?')
      .bind(userId, questionId)
      .first()
    return !!result
  }
}
