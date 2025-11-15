import { APP_CONFIG } from '../../config/constants'
import { calculateSpeedBonus, calculateStreakMultiplier } from './calculator'
import { ScoreCalculationInput, ScoreResult } from './types'

export class ScoringService {
  /**
   * Calculates score for a single question
   */
  calculateScore(input: ScoreCalculationInput): number {
    if (!input.correct) return 0

    const base = APP_CONFIG.BASE_SCORE_MULTIPLIER * input.difficulty
    const speedBonusPct = calculateSpeedBonus(input.timeMs)
    const streakMultPct = calculateStreakMultiplier(input.currentStreak)

    return Math.round(base * (1 + speedBonusPct + streakMultPct))
  }

  /**
   * Calculates detailed score breakdown
   */
  calculateScoreDetailed(input: ScoreCalculationInput): ScoreResult {
    if (!input.correct) {
      return { score: 0, speedBonus: 0, streakMultiplier: 0 }
    }

    const base = APP_CONFIG.BASE_SCORE_MULTIPLIER * input.difficulty
    const speedBonus = calculateSpeedBonus(input.timeMs)
    const streakMultiplier = calculateStreakMultiplier(input.currentStreak)
    const score = Math.round(base * (1 + speedBonus + streakMultiplier))

    return { score, speedBonus, streakMultiplier }
  }
}
