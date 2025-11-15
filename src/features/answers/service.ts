import { AnswerRepository } from './repository'
import { AnswerRecord } from './types'

export class AnswerService {
  constructor(private answerRepo: AnswerRepository) {}

  async recordAnswer(userId: string, questionId: string, correct: boolean): Promise<void> {
    await this.answerRepo.recordAnswer(userId, questionId, correct)
  }

  async getUserAnswers(userId: string, limit?: number): Promise<AnswerRecord[]> {
    const answers = await this.answerRepo.getUserAnswers(userId, limit)
    return answers.map((a) => ({
      questionId: a.question_id,
      correct: a.correct === 1,
      answeredAt: a.answered_at || '',
    }))
  }

  async hasAnswered(userId: string, questionId: string): Promise<boolean> {
    return this.answerRepo.hasAnswered(userId, questionId)
  }
}
