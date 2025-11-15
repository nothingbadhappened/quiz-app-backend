import { QuestionCriteria, QuestionWithDetails } from './types'
import { DatabaseClient } from '../../shared/database/client'

export class QuestionRepository {
  constructor(private db: DatabaseClient) {}

  async findQuestions(criteria: QuestionCriteria): Promise<QuestionWithDetails[]> {
    const { results } = await this.db
      .prepare(
        `SELECT qb.id as id, qt.prompt, qt.options, qt.correct_idx, qb.difficulty, qb.category
         FROM question_base qb
         INNER JOIN question_translation qt ON qb.id = qt.base_id
         WHERE qt.lang = ? AND qb.category = ? AND qb.difficulty BETWEEN ? AND ?
         ORDER BY qb.difficulty ASC, qb.created_at DESC
         LIMIT ?`
      )
      .bind(
        criteria.lang,
        criteria.category,
        criteria.minDifficulty,
        criteria.maxDifficulty,
        criteria.limit
      )
      .all<{
        id: string
        prompt: string
        options: string
        correct_idx: number
        difficulty: number
        category: string
      }>()

    return results.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      options: JSON.parse(r.options),
      correct_idx: r.correct_idx,
      difficulty: r.difficulty,
      category: r.category || 'general',
      lang: criteria.lang,
    }))
  }

  async getQuestionById(baseId: string, lang: string): Promise<QuestionWithDetails | null> {
    const result = await this.db
      .prepare(
        `SELECT qb.id, qt.prompt, qt.options, qt.correct_idx, qb.difficulty, qb.category
         FROM question_base qb
         INNER JOIN question_translation qt ON qb.id = qt.base_id
         WHERE qb.id = ? AND qt.lang = ?`
      )
      .bind(baseId, lang)
      .first<{
        id: string
        prompt: string
        options: string
        correct_idx: number
        difficulty: number
        category: string
      }>()

    if (!result) return null

    return {
      id: result.id,
      prompt: result.prompt,
      options: JSON.parse(result.options),
      correct_idx: result.correct_idx,
      difficulty: result.difficulty,
      category: result.category || 'general',
      lang,
    }
  }

  async getQuestionCount(criteria: Omit<QuestionCriteria, 'limit'>): Promise<number> {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count
         FROM question_base qb
         INNER JOIN question_translation qt ON qb.id = qt.base_id
         WHERE qt.lang = ? AND qb.category = ? AND qb.difficulty BETWEEN ? AND ?`
      )
      .bind(criteria.lang, criteria.category, criteria.minDifficulty, criteria.maxDifficulty)
      .first<{ count: number }>()

    return result?.count ?? 0
  }
}
