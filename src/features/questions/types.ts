export interface Question {
  id: string
  prompt: string
  options: string[]
  correct_idx: number
  difficulty: number
  category: string
}

export interface QuestionCriteria {
  lang: string
  category: string
  minDifficulty: number
  maxDifficulty: number
  limit: number
}

export interface QuestionWithDetails {
  id: string
  prompt: string
  options: string[]
  correct_idx: number
  difficulty: number
  category: string
  lang: string
}

export interface QuestionFetchParams {
  userId: string
  lang: string
  category: string
  n: number
  recentPerf: number
}
