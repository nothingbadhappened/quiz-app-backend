import { APP_CONFIG } from '../../config/constants'
import { msToSeconds } from '../../shared/utils/date'

/**
 * Calculates speed bonus percentage based on time taken
 */
export function calculateSpeedBonus(timeMs?: number): number {
  if (timeMs == null) return 0

  const t = msToSeconds(timeMs)
  const bonus = APP_CONFIG.MAX_SPEED_BONUS * Math.exp(-t / 8)
  return Math.min(APP_CONFIG.MAX_SPEED_BONUS, bonus)
}

/**
 * Calculates streak multiplier percentage
 */
export function calculateStreakMultiplier(currentStreak: number): number {
  const multiplier = APP_CONFIG.STREAK_INCREMENT_PER_LEVEL * Math.max(0, currentStreak)
  return Math.min(APP_CONFIG.MAX_STREAK_MULTIPLIER, multiplier)
}
