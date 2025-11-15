import { Hono } from 'hono'
import { Env } from '../../types/env'
import { QuestionService } from './service'

export function registerQuestionRoutes(
  app: Hono<{ Bindings: Env }>,
  service: QuestionService
) {
  app.get('/quiz/next', async (c) => {
    const userId = c.req.header('x-user') || ''
    const lang = c.req.query('lang') ?? 'en'
    const category = c.req.query('cat') ?? 'general'
    const n = Number(c.req.query('n') ?? 10)
    const recentPerf = Number(c.req.query('recentPerf') ?? 0.5)

    try {
      const questions = await service.getNextQuestions({
        userId,
        lang,
        category,
        n,
        recentPerf,
      })

      return c.json({ items: questions })
    } catch (e: any) {
      console.error('[/quiz/next] Error:', e.message, e.stack)
      return c.json({ error: e.message }, 500)
    }
  })
}
