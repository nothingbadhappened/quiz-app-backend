import { OpenAIClient } from './openai-client'
import { QuestionTranslator } from './translator'
import { QuestionValidator } from './validator'
import { DatabaseClient } from '../../shared/database/client'
import { GenItem, GenerationOptions, GenerationResult, CategoryDistribution } from './types'
import { APP_CONFIG } from '../../config/constants'

export class GenerationService {
  constructor(
    private db: DatabaseClient,
    private openaiClient: OpenAIClient,
    private translator: QuestionTranslator,
    private validator: QuestionValidator
  ) {}

  async getCategoryDistribution(): Promise<CategoryDistribution> {
    const dist: CategoryDistribution = {}

    try {
      const result = await this.db
        .prepare(
          `SELECT qb.category, COUNT(*) as count
           FROM question_base qb
           GROUP BY qb.category`
        )
        .all()

      for (const row of result.results || []) {
        dist[String((row as any).category)] = Number((row as any).count)
      }
    } catch (e) {
      console.warn('[GenerationService] Failed to get category distribution:', e)
    }

    return dist
  }

  async getSampleRecentQuestions(category: string | null, limit: number = 50): Promise<string[]> {
    try {
      let query = 'SELECT qt.prompt FROM question_translation qt WHERE qt.lang = ?'
      const params: any[] = ['en']

      if (category) {
        query += ' AND EXISTS (SELECT 1 FROM question_base qb WHERE qb.id = qt.base_id AND qb.category = ?)'
        params.push(category)
      }
      query += ' ORDER BY qt.created_at DESC LIMIT ?'
      params.push(limit)

      const result = await this.db.prepare(query).bind(...params).all()
      return (result.results || []).map((r: any) => String(r.prompt || ''))
    } catch (e) {
      console.warn('[GenerationService] Failed to fetch recent questions:', e)
      return []
    }
  }

  async generateEnglishQuestions(count: number, regions: string[]): Promise<GenItem[]> {
    console.log(`[GenerationService] Generating ${count} English questions`)

    const distribution = await this.getCategoryDistribution()
    console.log(`[GenerationService] Current distribution:`, distribution)

    const allCategories = APP_CONFIG.ALL_CATEGORIES
    const avgCount =
      Object.values(distribution).reduce((a, b) => a + b, 0) /
      Math.max(Object.keys(distribution).length, 1)
    const targetCategories = allCategories.filter((cat) => (distribution[cat] || 0) < avgCount)
    const focusCategories = targetCategories.length > 0 ? targetCategories : allCategories

    console.log(`[GenerationService] Focusing on categories:`, focusCategories)

    const recentQuestions = await this.getSampleRecentQuestions(null, 30)
    const avoidExamples =
      recentQuestions.length > 0
        ? `\n\nAVOID generating questions similar to these recent ones:\n${recentQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : ''

    const sys = `You are a rigorous trivia question generator. Generate ONLY English questions.
Return ONLY valid JSON Lines (one JSON object per line).
Family-friendly content. Verifiable facts. NO time-sensitive or contentious topics.
Focus on UNIQUE questions that are different from existing ones.

CRITICAL FORMAT REQUIREMENTS:
- EXACTLY 4 answer options per question
- correct_idx must be 1, 2, 3, or 4 (1-based index)
- Each option must be concise (max 100 characters)
- Include 1-3 reputable Wikipedia or educational sources
- One question per line (JSONL format)`

    const usr = `Generate ${count} UNIQUE trivia questions in English.

DISTRIBUTION:
- regions: ${JSON.stringify(regions)}
- FOCUS on these underrepresented categories: ${JSON.stringify(focusCategories)}
- difficulty levels (1-6): {"1":15%,"2":25%,"3":25%,"4":20%,"5":10%,"6":5%}
${avoidExamples}

OUTPUT FORMAT (one per line):
{"lang":"en","region":"global","category":"science","difficulty":3,"prompt":"What is the chemical symbol for gold?","options":["Au","Ag","Fe","Cu"],"correct_idx":1,"sources":[{"url":"https://en.wikipedia.org/wiki/Gold","title":"Gold"}]}

Generate exactly ${count} lines of valid JSONL with diverse, unique questions.`

    const text = await this.openaiClient.callOpenAI(
      [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      8000,
      'gpt-4o-mini'
    )

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
    const parsed: GenItem[] = []

    for (const line of lines) {
      try {
        const item = JSON.parse(line)
        if (this.validator.validateFormat(item)) {
          parsed.push(item)
        } else {
          console.warn('[GenerationService] Invalid item:', line.slice(0, 100))
        }
      } catch {
        console.warn('[GenerationService] Parse failed:', line.slice(0, 100))
      }
    }

    console.log(`[GenerationService] Parsed ${parsed.length} valid English questions`)
    return parsed
  }

  async insertWithTranslations(items: GenItem[]): Promise<number> {
    console.log(`[GenerationService] Processing ${items.length} items`)

    const baseMap = new Map<string, { base: GenItem; translations: Map<string, GenItem> }>()

    for (const it of items) {
      if (
        !it.options?.length ||
        it.correct_idx < 1 ||
        it.correct_idx > it.options.length
      ) {
        console.warn('[GenerationService] Skipping invalid item:', it.prompt?.slice(0, 50))
        continue
      }

      const key = it.group_id || `fallback_${it.prompt.slice(0, 30)}`

      if (!baseMap.has(key)) {
        baseMap.set(key, { base: it, translations: new Map() })
      }

      const entry = baseMap.get(key)!
      if (it.lang === 'en') {
        entry.base = it
      }
      entry.translations.set(it.lang, it)
    }

    console.log(`[GenerationService] Grouped into ${baseMap.size} base questions`)

    // Check for duplicates
    const existingPrompts = new Set<string>()
    try {
      const existing = await this.db
        .prepare(`SELECT qt.prompt FROM question_translation qt WHERE qt.lang = 'en' LIMIT 10000`)
        .all()

      for (const row of existing.results || []) {
        const normalized = String((row as any).prompt || '')
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        existingPrompts.add(normalized)
      }
      console.log(`[GenerationService] Found ${existingPrompts.size} existing questions`)
    } catch (e) {
      console.warn('[GenerationService] Could not check for duplicates:', e)
    }

    const stmts: D1PreparedStatement[] = []
    let skippedDuplicates = 0
    let skippedIncomplete = 0

    for (const [key, { base, translations }] of baseMap) {
      const requiredLangs = ['en', 'ru', 'es']
      const hasAllTranslations = requiredLangs.every((lang) => translations.has(lang))

      if (!hasAllTranslations) {
        const missing = requiredLangs.filter((lang) => !translations.has(lang))
        console.warn(
          `[GenerationService] Skipping incomplete question (missing: ${missing.join(', ')}): ${base.prompt?.slice(0, 50)}`
        )
        skippedIncomplete++
        continue
      }

      const englishTranslation = translations.get('en')!
      if (this.validator.isDuplicate(englishTranslation.prompt, existingPrompts)) {
        console.warn(
          `[GenerationService] Skipping duplicate: ${englishTranslation.prompt.slice(0, 50)}`
        )
        skippedDuplicates++
        continue
      }

      const baseId = crypto.randomUUID()
      const ans = base.options[base.correct_idx - 1]

      let verified = 0
      let sourceTitles: string[] = []
      if (base.sources?.length) {
        try {
          const v = await this.validator.lightVerify(base.sources[0].url, ans)
          verified = v.ok ? 1 : 0
          sourceTitles = base.sources.map(
            (s) => s.title || (s.url === base.sources[0].url ? (v.title || '') : '')
          )
        } catch (e) {
          console.warn('[GenerationService] Source verification failed:', e)
        }
      }

      // Insert base question
      stmts.push(
        this.db
          .prepare(
            `INSERT INTO question_base
             (id, category, difficulty, region, source_urls, source_titles, verified)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            baseId,
            base.category,
            Math.max(1, Math.min(6, Math.floor(base.difficulty))),
            base.region || 'global',
            JSON.stringify(base.sources?.map((s) => s.url) || []),
            JSON.stringify(sourceTitles),
            verified
          )
      )

      // Insert all translations
      for (const [lang, translation] of translations) {
        stmts.push(
          this.db
            .prepare(
              `INSERT INTO question_translation
               (base_id, lang, prompt, options, correct_idx)
               VALUES (?, ?, ?, ?, ?)`
            )
            .bind(
              baseId,
              lang,
              translation.prompt.trim(),
              JSON.stringify(translation.options),
              translation.correct_idx - 1 // Convert to 0-based
            )
        )
      }
    }

    console.log(
      `[GenerationService] Inserting ${stmts.length} statements (${Math.floor(stmts.length / 4)} base questions)`
    )
    console.log(
      `[GenerationService] Skipped: ${skippedDuplicates} duplicates, ${skippedIncomplete} incomplete`
    )

    if (stmts.length) await this.db.batch(stmts)
    return Math.floor(stmts.length / 4)
  }

  async generateWithTranslations(opts: GenerationOptions): Promise<GenerationResult> {
    console.log('[GenerationService] Starting with opts:', JSON.stringify(opts))

    const englishQuestions = await this.generateEnglishQuestions(opts.count, opts.regions)

    if (englishQuestions.length === 0) {
      console.error('[GenerationService] No English questions generated')
      return { requested: opts.count, parsed: 0, inserted: 0 }
    }

    console.log(`[GenerationService] Generated ${englishQuestions.length} English questions`)

    // Assign unique group IDs
    for (let i = 0; i < englishQuestions.length; i++) {
      englishQuestions[i].group_id = `grp_${Date.now()}_${i}`
    }

    // Translate to other languages
    const otherLangs = opts.langs.filter((l) => l !== 'en')
    const translations = await this.translator.translateQuestions(englishQuestions, otherLangs)

    // Combine into complete question sets
    const completeQuestions: GenItem[] = []
    let completeCount = 0
    let incompleteCount = 0

    for (let i = 0; i < englishQuestions.length; i++) {
      const english = englishQuestions[i]
      const groupTranslations: GenItem[] = [english]

      let hasAllTranslations = true
      for (const targetLang of otherLangs) {
        const langTranslations = translations.get(targetLang) || []
        if (i < langTranslations.length) {
          const translation = langTranslations[i]
          translation.group_id = english.group_id
          groupTranslations.push(translation)
        } else {
          console.warn(
            `[GenerationService] Missing ${targetLang} translation for question ${i}: "${english.prompt.slice(0, 50)}..."`
          )
          hasAllTranslations = false
        }
      }

      if (hasAllTranslations && groupTranslations.length === opts.langs.length) {
        completeQuestions.push(...groupTranslations)
        completeCount++
      } else {
        incompleteCount++
        console.warn(
          `[GenerationService] Skipping question ${i} - incomplete translations (have ${groupTranslations.length}/${opts.langs.length})`
        )
      }
    }

    console.log(
      `[GenerationService] Complete questions: ${completeCount}, Incomplete: ${incompleteCount}`
    )

    if (completeQuestions.length === 0) {
      console.error('[GenerationService] No complete question sets to insert!')
      return { requested: opts.count, parsed: 0, inserted: 0 }
    }

    const inserted = await this.insertWithTranslations(completeQuestions)
    console.log(`[GenerationService] Successfully inserted ${inserted} base questions`)

    return {
      requested: opts.count,
      parsed: completeQuestions.length,
      inserted,
      complete: completeCount,
      incomplete: incompleteCount,
    }
  }
}
