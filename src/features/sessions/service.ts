import { SessionRepository } from './repository'
import { AnswerService } from '../answers/service'
import { SkillService } from '../skills/service'
import { StreakService } from '../streaks/service'
import { QuestionService } from '../questions/service'
import { ScoringService } from '../scoring/service'
import { DatabaseClient } from '../../shared/database/client'
import { updateMu } from '../skills/algorithms'
import { QuestionResult } from './types'

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private answerService: AnswerService,
    private skillService: SkillService,
    private streakService: StreakService,
    private questionService: QuestionService,
    private scoringService: ScoringService,
    private db: DatabaseClient
  ) {}

  async startSession(userId: string, mode: string): Promise<string> {
    return this.sessionRepo.createSession(userId, mode)
  }

  async finishSession(
    sessionId: string,
    userId: string,
    results: QuestionResult[],
    finalScore: number,
    maxStreak: number
  ): Promise<{ newMu: number }> {
    console.log(
      '[SessionService] Processing session:',
      sessionId,
      'Questions:',
      results.length,
      'Score:',
      finalScore,
      'MaxStreak:',
      maxStreak
    )

    // Validate session exists and belongs to user
    const session = await this.sessionRepo.getSessionById(sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    if (session.user_id !== userId) {
      throw new Error('Unauthorized: Session does not belong to user')
    }
    if (session.ended_at) {
      throw new Error('Session already completed')
    }

    // Get current user skill
    const currentMu = await this.skillService.getUserSkill(userId)

    // Update skill level based on all answers
    let updatedMu = currentMu
    for (const q of results) {
      updatedMu = updateMu(updatedMu, q.correct, q.timeMs)
    }

    // Get current streak state to preserve best_streak maximum
    const currentStreakState = await this.streakService.getStreak(userId)
    const newBestStreak = Math.max(currentStreakState?.best_streak || 0, maxStreak)

    // Prepare batch statements
    const statements: D1PreparedStatement[] = []

    // 1. Update user skill
    statements.push(
      this.db
        .prepare(
          'INSERT OR REPLACE INTO user_skill (user_id, mu, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
        )
        .bind(userId, updatedMu)
    )

    // 2. Update streak state (reset current streak after session, preserve best)
    statements.push(
      this.db
        .prepare(
          'INSERT OR REPLACE INTO streak_state (user_id, current_streak, best_streak, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
        )
        .bind(userId, 0, newBestStreak)
    )

    // 3. Record all answers
    for (const q of results) {
      statements.push(
        this.db
          .prepare(
            'INSERT OR REPLACE INTO user_answer (user_id, question_id, correct) VALUES (?, ?, ?)'
          )
          .bind(userId, q.questionId, q.correct ? 1 : 0)
      )
    }

    // 4. Update session with final scores
    statements.push(
      this.db
        .prepare(
          `UPDATE run_session
           SET score = ?, max_streak = ?, ended_at = CURRENT_TIMESTAMP
           WHERE id = ? AND user_id = ? AND ended_at IS NULL`
        )
        .bind(finalScore, maxStreak, sessionId, userId)
    )

    // Execute all database updates in batch
    await this.db.batch(statements)

    // Mark all questions as seen in KV
    const questionIds = results.map((r) => r.questionId)
    await this.questionService.markMultipleAsSeen(userId, questionIds)

    // Update topic preferences
    const categoryScores = new Map<string, { correct: number; total: number }>()

    for (const q of results) {
      const current = categoryScores.get(q.category) || { correct: 0, total: 0 }
      categoryScores.set(q.category, {
        correct: current.correct + (q.correct ? 1 : 0),
        total: current.total + 1,
      })
    }

    const topicUpdates = Array.from(categoryScores.entries()).map(([category, stats]) => ({
      category,
      accuracy: stats.correct / stats.total,
    }))

    await this.skillService.updateTopicPreferences(userId, topicUpdates)

    console.log(
      '[SessionService] Session completed. Final mu:',
      updatedMu,
      'Seen questions:',
      questionIds.length
    )

    return { newMu: updatedMu }
  }
}
