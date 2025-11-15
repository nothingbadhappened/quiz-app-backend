import { SpeedBucket } from '../skills/types'

export interface ScoreCalculationInput {
  difficulty: number
  timeMs?: number
  currentStreak: number
  correct: boolean
}

export interface ScoreResult {
  score: number
  speedBonus: number
  streakMultiplier: number
}
