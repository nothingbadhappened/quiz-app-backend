import { APP_CONFIG } from '../../config/constants'
import { clamp } from '../../shared/utils/math'
import { SpeedBucket } from './types'

/**
 * Determines speed bucket based on time taken
 */
export function getSpeedBucket(timeMs: number | undefined): SpeedBucket {
  if (timeMs == null) return 'normal'
  if (timeMs <= APP_CONFIG.FAST_THRESHOLD_MS) return 'fast'
  if (timeMs <= APP_CONFIG.NORMAL_THRESHOLD_MS) return 'normal'
  return 'slow'
}

/**
 * Calculates skill delta based on correctness and speed
 */
export function calculateSkillDelta(correct: boolean, speedBucket: SpeedBucket): number {
  const deltas = correct
    ? APP_CONFIG.SPEED_DELTAS.correct
    : APP_CONFIG.SPEED_DELTAS.wrong

  return deltas[speedBucket]
}

/**
 * Updates user skill (μ) based on answer
 */
export function updateMu(mu: number, correct: boolean, timeMs?: number): number {
  const bucket = getSpeedBucket(timeMs)
  const delta = calculateSkillDelta(correct, bucket)
  return clamp(mu + delta, APP_CONFIG.MIN_SKILL, APP_CONFIG.MAX_SKILL)
}

/**
 * Calculates target difficulty based on skill level
 */
export function targetDifficulty(mu: number): number {
  return clamp(Math.round(mu), 1, 6)
}

/**
 * Clamps skill to valid range
 */
export function clampSkill(mu: number): number {
  return clamp(mu, APP_CONFIG.MIN_SKILL, APP_CONFIG.MAX_SKILL)
}
