export interface SessionMode {
  mode: 'run' | 'endless' | 'daily'
}

export interface StartSessionRequest {
  mode: 'run' | 'endless' | 'daily'
}

export interface StartSessionResponse {
  sessionId: string
}

export interface QuestionResult {
  questionId: string
  selectedIdx: number
  timeMs: number
  difficulty: number
  category: string
  correct: boolean
}

export interface FinishSessionRequest {
  sessionId: string
  questions: QuestionResult[]
  finalScore: number
  maxStreak: number
}

export interface FinishSessionResponse {
  ok: boolean
  score: number
  maxStreak: number
  newMu: number
}

export interface Session {
  id: string
  user_id: string
  mode: string
  started_at?: string
  ended_at?: string
  score?: number
  lives_used?: number
  max_streak?: number
}
