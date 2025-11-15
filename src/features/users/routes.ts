import { Hono } from 'hono'
import { Env } from '../../types/env'
import { UserService } from './service'
import { RegisterRequest, RegisterResponse } from './types'

export function registerUserRoutes(app: Hono<{ Bindings: Env }>, service: UserService) {
  app.post('/register', async (c) => {
    try {
      const body = await c.req.json<RegisterRequest>().catch(() => ({} as RegisterRequest))
      const { username, locale = 'en' } = body

      const result = await service.createUser(username, locale, !username)

      return c.json<RegisterResponse>({
        userId: result.userId,
        token: result.userId, // For backward compatibility with anonymous users
      })
    } catch (e: any) {
      console.error('REGISTER_ERROR', e.message, e.stack)
      return c.json({ error: e.message }, 500)
    }
  })
}
