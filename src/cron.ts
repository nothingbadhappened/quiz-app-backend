import { Env } from './types/env'
import { DatabaseClient } from './shared/database/client'
import { OpenAIClient } from './features/generation/openai-client'
import { QuestionTranslator } from './features/generation/translator'
import { QuestionValidator } from './features/generation/validator'
import { GenerationService } from './features/generation/service'

/**
 * Scheduled job to generate questions nightly
 * Runs at 01:00 UTC daily
 */
export async function runQuestionGeneration(env: Env): Promise<void> {
  const langs = ['en', 'ru', 'es']
  const regions = ['global']

  const nightlyTarget = Number(env.NIGHTLY_TARGET || 100)
  const maxTotalBase = Number(env.MAX_TOTAL_QUESTIONS || 100000)

  try {
    // Initialize database client
    const dbClient = new DatabaseClient(env.DB)

    // Check current count
    const countResult = await dbClient.prepare(
      'SELECT COUNT(*) as count FROM question_base'
    ).first<{ count: number }>()

    const currentCount = countResult?.count ?? 0

    if (currentCount >= maxTotalBase) {
      console.log(
        `[CRON] Already have ${currentCount} base questions (target: ${maxTotalBase}). Skipping.`
      )
      return
    }

    const remaining = maxTotalBase - currentCount
    const toGenerate = Math.min(nightlyTarget, remaining)

    console.log(
      `[CRON] Generating ${toGenerate} base questions with ${langs.length} translations (current: ${currentCount}/${maxTotalBase})`
    )

    // Initialize generation service
    const openaiClient = new OpenAIClient(env.OPENAI_API_KEY)
    const translator = new QuestionTranslator(openaiClient)
    const validator = new QuestionValidator()
    const generationService = new GenerationService(
      dbClient,
      openaiClient,
      translator,
      validator
    )

    // Generate questions
    const result = await generationService.generateWithTranslations({
      langs,
      regions,
      count: toGenerate,
    })

    console.log(`[CRON] Successfully inserted ${result.inserted} base questions with translations`)
  } catch (e: any) {
    console.error('[CRON] Failed:', e.message, e.stack)
  }
}
