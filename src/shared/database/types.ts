// Common database types

export interface User {
  id: string
  username: string
  username_norm: string
  locale: string
  password_hash?: string
  password_salt?: string
  password_algo?: string
  password_params?: string
  last_login_at?: string
  password_updated_at?: string
  created_at: string
}

export interface QuestionBase {
  id: string
  category: string
  difficulty: number
  region: string
  source_urls: string // JSON
  source_titles: string // JSON
  verified: number
  created_at: string
}

export interface QuestionTranslation {
  base_id: string
  lang: string
  prompt: string
  options: string // JSON
  correct_idx: number
  created_at: string
}

export interface UserAnswer {
  user_id: string
  question_id: string
  correct: number
  answered_at?: string
}

export interface UserSkill {
  user_id: string
  mu: number
  updated_at?: string
}

export interface RunSession {
  id: string
  user_id: string
  mode: string
  started_at?: string
  ended_at?: string
  score?: number
  lives_used?: number
  max_streak?: number
}

export interface StreakState {
  user_id: string
  current_streak: number
  best_streak: number
  updated_at?: string
}

export interface TopicPreference {
  user_id: string
  topic: string
  weight: number
}
