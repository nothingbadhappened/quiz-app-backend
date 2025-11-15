export interface StreakState {
  current_streak: number
  best_streak: number
  updated_at?: string
}

export interface StreakUpdate {
  currentStreak: number
  bestStreak: number
}
