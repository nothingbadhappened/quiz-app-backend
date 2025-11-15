/**
 * Clamps a value between a minimum and maximum
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Safely parses a number from a string or number, with fallback
 */
export function parseNumber(value: any, fallback: number): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Rounds a number to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/**
 * Parses and normalizes difficulty from various formats
 * Ensures the result is a number between 1 and 6
 */
export function parseDifficulty(difficulty: any): number {
  const raw = (difficulty ?? '3').toString()
  const n = parseInt(raw, 10)
  return clamp(isNaN(n) ? 3 : n, 1, 6)
}
