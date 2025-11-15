/**
 * Gets current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Converts milliseconds to seconds
 */
export function msToSeconds(ms: number): number {
  return ms / 1000
}
