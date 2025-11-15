import { APP_CONFIG } from '../../config/constants'
import { targetDifficulty } from '../skills/algorithms'
import { clamp } from '../../shared/utils/math'

export interface DifficultyRange {
  min: number
  max: number
}

/**
 * Calculates adaptive difficulty range based on user skill and recent performance
 */
export function calculateDifficultyRange(
  userSkill: number,
  recentPerf: number
): DifficultyRange {
  const dTarget = targetDifficulty(userSkill)

  let minDiff: number, maxDiff: number

  if (recentPerf < APP_CONFIG.RECENT_PERF_THRESHOLD_LOW) {
    // Struggling: Focus on easier questions
    minDiff = Math.max(1, dTarget + APP_CONFIG.DIFFICULTY_RANGE_STRUGGLING.min)
    maxDiff = dTarget + APP_CONFIG.DIFFICULTY_RANGE_STRUGGLING.max
  } else if (recentPerf > APP_CONFIG.RECENT_PERF_THRESHOLD_HIGH) {
    // Doing well: Include more challenging questions
    minDiff = dTarget + APP_CONFIG.DIFFICULTY_RANGE_EXCELLING.min
    maxDiff = Math.min(6, dTarget + APP_CONFIG.DIFFICULTY_RANGE_EXCELLING.max)
  } else {
    // Average: Balanced progression
    minDiff = Math.max(1, dTarget + APP_CONFIG.DIFFICULTY_RANGE_BALANCED.min)
    maxDiff = Math.min(6, dTarget + APP_CONFIG.DIFFICULTY_RANGE_BALANCED.max)
  }

  return {
    min: clamp(minDiff, 1, 6),
    max: clamp(maxDiff, 1, 6),
  }
}

/**
 * Widens difficulty range for retry attempts
 */
export function widenDifficultyRange(
  range: DifficultyRange,
  expansion: number
): DifficultyRange {
  return {
    min: Math.max(1, range.min - expansion),
    max: Math.min(6, range.max + expansion),
  }
}

/**
 * Filters out seen questions, prioritizing unseen
 */
export function filterAndPrioritizeQuestions<T extends { id: string }>(
  questions: T[],
  seenQuestions: Set<string>,
  limit: number
): { unseen: T[]; seen: T[] } {
  const unseen: T[] = []
  const seen: T[] = []

  for (const q of questions) {
    if (seenQuestions.has(q.id)) {
      seen.push(q)
    } else {
      unseen.push(q)
    }
  }

  return { unseen, seen }
}
