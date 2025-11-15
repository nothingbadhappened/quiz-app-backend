import { APP_CONFIG } from '../../config/constants'

/**
 * Validates username format
 */
export function validateUsername(username: string): boolean {
  return (
    username.length >= APP_CONFIG.MIN_USERNAME_LENGTH &&
    username.length <= APP_CONFIG.MAX_USERNAME_LENGTH &&
    /^[a-zA-Z0-9_]+$/.test(username)
  )
}

/**
 * Validates password length
 */
export function validatePassword(password: string): boolean {
  return password.length >= APP_CONFIG.MIN_PASSWORD_LENGTH
}

/**
 * Validates locale is supported
 */
export function validateLocale(locale: string): boolean {
  return APP_CONFIG.SUPPORTED_LANGUAGES.includes(locale as any)
}

/**
 * Normalizes username to lowercase for case-insensitive comparison
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

/**
 * Parses JSON safely with fallback
 */
export function parseJSON<T = any>(str: string, fallback: T = [] as any): T {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}
