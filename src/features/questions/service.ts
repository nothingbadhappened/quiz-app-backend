import { QuestionRepository } from './repository'
import { SkillService } from '../skills/service'
import { KVCache } from '../../shared/cache/kv-client'
import { Question, QuestionFetchParams } from './types'
import {
  calculateDifficultyRange,
  widenDifficultyRange,
  filterAndPrioritizeQuestions,
} from './selection-strategy'
import { APP_CONFIG } from '../../config/constants'
import { parseJSON } from '../../shared/utils/validation'

export class QuestionService {
  constructor(
    private questionRepo: QuestionRepository,
    private skillService: SkillService,
    private kvCache: KVCache
  ) {}

  async getNextQuestions(params: QuestionFetchParams): Promise<Question[]> {
    const { userId, lang, category, n, recentPerf } = params

    console.log('[QuestionService] Request params:', params)

    // Get user skill
    const mu = await this.skillService.getUserSkill(userId)

    // Calculate adaptive difficulty range
    let diffRange = calculateDifficultyRange(mu, recentPerf)
    console.log('[QuestionService] Initial difficulty range:', diffRange)

    const fetchLimit = n * APP_CONFIG.QUESTION_FETCH_MULTIPLIER
    let allQuestions: Question[] = []

    // Try fetching in requested language
    let results = await this.questionRepo.findQuestions({
      lang,
      category,
      minDifficulty: diffRange.min,
      maxDifficulty: diffRange.max,
      limit: fetchLimit,
    })

    console.log('[QuestionService] Got', results.length, 'questions in', lang)

    // Fallback to English if no results and lang != 'en'
    if (results.length === 0 && lang !== 'en') {
      console.log('[QuestionService] Falling back to English')
      results = await this.questionRepo.findQuestions({
        lang: 'en',
        category,
        minDifficulty: diffRange.min,
        maxDifficulty: diffRange.max,
        limit: fetchLimit,
      })
    }

    allQuestions = results.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      options: r.options,
      correct_idx: r.correct_idx,
      difficulty: r.difficulty,
      category: r.category,
    }))

    // Progressively widen difficulty range if not enough questions
    let expandRange = 1
    while (
      allQuestions.length < n &&
      expandRange <= APP_CONFIG.MAX_DIFFICULTY_RANGE_EXPANSION
    ) {
      const widerRange = widenDifficultyRange(diffRange, expandRange)
      console.log('[QuestionService] Widening range to', widerRange)

      const widerResults = await this.questionRepo.findQuestions({
        lang: lang !== 'en' ? 'en' : lang,
        category,
        minDifficulty: widerRange.min,
        maxDifficulty: widerRange.max,
        limit: n - allQuestions.length,
      })

      for (const q of widerResults) {
        if (!allQuestions.find((existing) => existing.id === q.id)) {
          allQuestions.push({
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            correct_idx: q.correct_idx,
            difficulty: q.difficulty,
            category: q.category,
          })
        }
      }

      expandRange++
    }

    // Get seen questions from KV
    const seenRaw = await this.kvCache.get<string>(this.kvCache.seenKey(userId))
    const seen = new Set<string>(seenRaw ? parseJSON<string[]>(seenRaw) : [])

    // Sort by difficulty (progressive curve)
    const sortedByDifficulty = allQuestions.sort((a, b) => a.difficulty - b.difficulty)

    // Filter and prioritize unseen questions
    const { unseen, seen: seenQuestions } = filterAndPrioritizeQuestions(
      sortedByDifficulty,
      seen,
      n
    )

    // First pass: unseen questions
    const selected: Question[] = []
    selected.push(...unseen.slice(0, n))

    // Second pass: fill remaining with seen questions
    if (selected.length < n) {
      selected.push(...seenQuestions.slice(0, n - selected.length))
    }

    console.log(
      '[QuestionService] Returning',
      selected.length,
      'questions (',
      unseen.length,
      'unseen,',
      seenQuestions.length,
      'seen)'
    )

    return selected
  }

  async markAsSeen(userId: string, questionId: string): Promise<void> {
    const seenRaw = await this.kvCache.get<string>(this.kvCache.seenKey(userId))
    const seenArr: string[] = seenRaw ? parseJSON<string[]>(seenRaw) : []

    if (!seenArr.includes(questionId)) {
      seenArr.push(questionId)
    }

    await this.kvCache.set(this.kvCache.seenKey(userId), JSON.stringify(seenArr), {
      expirationTtl: APP_CONFIG.SEEN_QUESTIONS_TTL_SECONDS,
    })
  }

  async markMultipleAsSeen(userId: string, questionIds: string[]): Promise<void> {
    const seenRaw = await this.kvCache.get<string>(this.kvCache.seenKey(userId))
    const seenArr: string[] = seenRaw ? parseJSON<string[]>(seenRaw) : []

    for (const qId of questionIds) {
      if (!seenArr.includes(qId)) {
        seenArr.push(qId)
      }
    }

    await this.kvCache.set(this.kvCache.seenKey(userId), JSON.stringify(seenArr), {
      expirationTtl: APP_CONFIG.SEEN_QUESTIONS_TTL_SECONDS,
    })
  }
}
