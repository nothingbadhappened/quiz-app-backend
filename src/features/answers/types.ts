export interface Answer {
  user_id: string
  question_id: string
  correct: number
  answered_at?: string
}

export interface AnswerRecord {
  questionId: string
  correct: boolean
  answeredAt: string
}
