export const APP_CONFIG = {
  // Skill system
  INITIAL_SKILL_MU: 3.0,
  MIN_SKILL: 1.0,
  MAX_SKILL: 6.0,

  // Scoring
  BASE_SCORE_MULTIPLIER: 100,
  MAX_SPEED_BONUS: 0.3,
  MAX_STREAK_MULTIPLIER: 0.5,
  STREAK_INCREMENT_PER_LEVEL: 0.1,

  // Timing (milliseconds)
  FAST_THRESHOLD_MS: 5000,
  NORMAL_THRESHOLD_MS: 12000,

  // Speed deltas
  SPEED_DELTAS: {
    correct: { fast: 0.30, normal: 0.20, slow: 0.10 },
    wrong: { fast: -0.30, normal: -0.20, slow: -0.10 },
  },

  // Generation
  DAILY_GENERATION_COUNT: 100,
  MAX_TOTAL_QUESTIONS: 100000,
  SUPPORTED_LANGUAGES: ['en', 'ru', 'es'] as const,
  GENERATION_BATCH_SIZE: 10,

  // Categories
  ALL_CATEGORIES: [
    'general',
    'science',
    'history',
    'geography',
    'tech',
    'movies',
    'music',
    'sports',
    'literature',
    'nature',
    'popculture',
    'logic',
    'math',
  ] as const,

  // Cache TTL (seconds)
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60, // 7 days
  SEEN_QUESTIONS_TTL_SECONDS: 30 * 24 * 60 * 60, // 30 days
  RESET_TOKEN_TTL_SECONDS: 15 * 60, // 15 minutes
  DEFAULT_SESSION_TTL: 30 * 24 * 60 * 60, // 30 days

  // Password hashing (scrypt params)
  SCRYPT_N: 2 ** 15,
  SCRYPT_R: 8,
  SCRYPT_P: 1,
  SCRYPT_DKLEN: 32,

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,
  MAX_REGISTRATION_ATTEMPTS: 5,

  // Question selection
  QUESTION_FETCH_MULTIPLIER: 5, // Fetch 5x more questions than needed
  MAX_DIFFICULTY_RANGE_EXPANSION: 3,

  // Topic preferences
  MIN_TOPIC_WEIGHT: -5,
  MAX_TOPIC_WEIGHT: 5,
  TOPIC_WEIGHT_DELTA_HIGH: 0.2, // accuracy > 70%
  TOPIC_WEIGHT_DELTA_LOW: -0.2, // accuracy < 30%
  TOPIC_ACCURACY_THRESHOLD_HIGH: 0.7,
  TOPIC_ACCURACY_THRESHOLD_LOW: 0.3,

  // Difficulty adaptation
  DIFFICULTY_RANGE_STRUGGLING: { min: -2, max: 0 }, // recentPerf < 0.4
  DIFFICULTY_RANGE_EXCELLING: { min: 0, max: 2 }, // recentPerf > 0.7
  DIFFICULTY_RANGE_BALANCED: { min: -1, max: 1 }, // default
  RECENT_PERF_THRESHOLD_LOW: 0.4,
  RECENT_PERF_THRESHOLD_HIGH: 0.7,
}

export type SupportedLanguage = (typeof APP_CONFIG.SUPPORTED_LANGUAGES)[number]
export type Category = (typeof APP_CONFIG.ALL_CATEGORIES)[number]
