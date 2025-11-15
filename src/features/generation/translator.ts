import { OpenAIClient } from './openai-client'
import { GenItem } from './types'
import { APP_CONFIG } from '../../config/constants'

export class QuestionTranslator {
  constructor(private openaiClient: OpenAIClient) {}

  async translateQuestions(
    englishQuestions: GenItem[],
    targetLangs: string[]
  ): Promise<Map<string, GenItem[]>> {
    console.log(
      `[QuestionTranslator] Translating ${englishQuestions.length} questions to ${targetLangs.join(', ')}`
    )

    const translations = new Map<string, GenItem[]>()
    const batchSize = APP_CONFIG.GENERATION_BATCH_SIZE

    for (let i = 0; i < englishQuestions.length; i += batchSize) {
      const batch = englishQuestions.slice(i, i + batchSize)

      for (const targetLang of targetLangs) {
        if (targetLang === 'en') continue

        const langName = targetLang === 'ru' ? 'Russian' : targetLang === 'es' ? 'Spanish' : targetLang

        const sys = `You are a professional translator. Translate trivia questions to ${langName}.
CRITICAL: Keep the same structure, translate prompt and options. Maintain factual accuracy.
Return ONLY valid JSON Lines (one per line).`

        const questionList = batch
          .map(
            (q, idx) =>
              `${idx + 1}. ${JSON.stringify({ prompt: q.prompt, options: q.options, correct_idx: q.correct_idx })}`
          )
          .join('\n')

        const usr = `Translate these ${batch.length} trivia questions to ${langName}.

For each question, output ONE line of JSON with this format:
{"question_idx":1,"prompt":"translated prompt","options":["opt1","opt2","opt3","opt4"]}

Questions to translate:
${questionList}

Output ${batch.length} lines of JSON, one per question in order.`

        try {
          const text = await this.openaiClient.callOpenAI(
            [
              { role: 'system', content: sys },
              { role: 'user', content: usr },
            ],
            4000,
            'gpt-3.5-turbo'
          )

          const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)

          for (const line of lines) {
            try {
              const translated = JSON.parse(line)
              const originalIdx = (translated.question_idx || 0) - 1

              if (originalIdx >= 0 && originalIdx < batch.length) {
                const original = batch[originalIdx]
                const translatedQuestion: GenItem = {
                  lang: targetLang,
                  region: original.region,
                  category: original.category,
                  difficulty: original.difficulty,
                  prompt: translated.prompt,
                  options: translated.options,
                  correct_idx: original.correct_idx,
                  sources: original.sources,
                }

                if (!translations.has(targetLang)) {
                  translations.set(targetLang, [])
                }
                translations.get(targetLang)!.push(translatedQuestion)
              }
            } catch {
              console.warn(`[QuestionTranslator] Failed to parse translation: ${line.slice(0, 100)}`)
            }
          }
        } catch (e: any) {
          console.error(
            `[QuestionTranslator] Failed to translate batch to ${targetLang}:`,
            e.message
          )
        }
      }
    }

    for (const [lang, items] of translations) {
      console.log(`[QuestionTranslator] Got ${items.length} ${lang} translations`)
    }

    return translations
  }
}
