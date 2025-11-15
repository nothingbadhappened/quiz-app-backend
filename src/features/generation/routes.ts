import { Hono } from 'hono'
import { Env } from '../../types/env'
import { GenerationService } from './service'

export function registerGenerationRoutes(
  app: Hono<{ Bindings: Env }>,
  service: GenerationService,
  adminKey: string
) {
  // Manual generation endpoint
  app.post('/admin/generate', async (c) => {
    const auth = c.req.header('authorization') || ''
    if (auth !== `Bearer ${adminKey}`) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const body = await c.req.json().catch(() => ({}))
    const { langs = ['en', 'ru', 'es'], regions = ['global'], count = 100 } = body as any

    try {
      const result = await service.generateWithTranslations({
        langs,
        regions,
        count: Math.min(500, Number(count) || 100),
      })

      return c.json({ ok: true, ...result })
    } catch (e: any) {
      return c.json({ ok: false, error: e.message })
    }
  })

  // Manual cron trigger endpoint
  app.post('/admin/trigger-cron', async (c) => {
    const auth = c.req.header('authorization') || ''
    if (auth !== `Bearer ${adminKey}`) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    try {
      const langs = ['en', 'ru', 'es']
      const regions = ['global']
      const nightlyTarget = 100
      const maxTotalBase = 100000

      const countResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM question_base').first<{
        count: number
      }>()

      const currentCount = countResult?.count ?? 0

      if (currentCount >= maxTotalBase) {
        return c.json({
          ok: true,
          message: `Already have ${currentCount} base questions (target: ${maxTotalBase})`,
          skipped: true,
        })
      }

      const remaining = maxTotalBase - currentCount
      const toGenerate = Math.min(nightlyTarget, remaining)

      console.log(
        `[MANUAL TRIGGER] Generating ${toGenerate} base questions with ${langs.length} translations (current: ${currentCount}/${maxTotalBase})`
      )

      const result = await service.generateWithTranslations({
        langs,
        regions,
        count: toGenerate,
      })

      return c.json({
        ok: true,
        message: `Successfully inserted ${result.inserted} base questions with translations`,
        inserted: result.inserted,
        currentCount: currentCount + (result.inserted || 0),
        remaining: maxTotalBase - (currentCount + (result.inserted || 0)),
      })
    } catch (e: any) {
      console.error('[MANUAL TRIGGER] Failed:', e.message, e.stack)
      return c.json({ ok: false, error: e.message, stack: e.stack }, 500)
    }
  })
}
