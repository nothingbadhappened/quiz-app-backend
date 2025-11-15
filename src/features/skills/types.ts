export interface SkillLevel {
  mu: number
  updated_at?: string
}

export interface TopicPreference {
  topic: string
  weight: number
}

export interface TopicUpdate {
  category: string
  accuracy: number
}

export type SpeedBucket = 'fast' | 'normal' | 'slow'
