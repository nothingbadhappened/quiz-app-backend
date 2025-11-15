export interface GenItem {
  lang: string
  region: string
  category: string
  difficulty: number
  prompt: string
  options: string[]
  correct_idx: number
  sources: Array<{ url: string; title?: string }>
  group_id?: string
}

export interface GenerationOptions {
  langs: string[]
  regions: string[]
  count: number
}

export interface GenerationResult {
  requested: number
  parsed: number
  inserted: number
  complete?: number
  incomplete?: number
}

export interface CategoryDistribution {
  [category: string]: number
}
