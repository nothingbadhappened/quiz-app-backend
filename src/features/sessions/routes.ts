import { Hono } from 'hono'
import { Env } from '../../types/env'
import { SessionService } from './service'
import { StartSessionRequest, FinishSessionRequest } from './types'

export function registerSessionRoutes(
  app: Hono<{ Bindings: Env }>,
  service: SessionService
) {
  // Start session
  app.post('/session/start', async (c) => {
    const userId = c.req.header('x-user') || ''
    const body = await c.req.json<StartSessionRequest>()
    const { mode } = body

    try {
      const sessionId = await service.startSession(userId, mode)
      return c.json({ sessionId })
    } catch (e: any) {
      console.error('[/session/start] Error:', e.message, e.stack)
      return c.json({ error: e.message }, 500)
    }
  })

  // Finish session
  app.post('/session/finish', async (c) => {
    const userId = c.req.header('x-user') || ''
    const body = await c.req.json<FinishSessionRequest>()
    const { sessionId, questions, finalScore, maxStreak } = body

    try {
      const result = await service.finishSession(
        sessionId,
        userId,
        questions,
        finalScore,
        maxStreak
      )

      return c.json({
        ok: true,
        score: finalScore,
        maxStreak,
        newMu: result.newMu,
      })
    } catch (e: any) {
      console.error('[/session/finish] Error:', e.message, e.stack)
      return c.json({ error: e.message }, 500)
    }
  })
}
