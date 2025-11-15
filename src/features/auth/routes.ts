import { Hono } from 'hono'
import { Env } from '../../types/env'
import { AuthService } from './service'
import {
  LoginRequest,
  RegisterRequest,
  PasswordResetRequest,
  ResetPasswordRequest,
} from './types'

export function registerAuthRoutes(app: Hono<{ Bindings: Env }>, service: AuthService) {
  // Register with password
  app.post('/auth/register', async (c) => {
    try {
      const body = await c.req.json<RegisterRequest>().catch(() => ({} as RegisterRequest))
      const { username, password, locale = 'en' } = body

      if (!username || !password || password.length < 8) {
        return c.json({ error: 'username and password(>=8) required' }, 400)
      }

      const result = await service.register(username, password, locale)
      return c.json(result)
    } catch (e: any) {
      if (e.message === 'username_taken') {
        return c.json({ error: 'username_taken' }, 409)
      }
      return c.json({ error: e.message }, 500)
    }
  })

  // Login
  app.post('/auth/login', async (c) => {
    try {
      const body = await c.req.json<LoginRequest>().catch(() => ({} as LoginRequest))
      const { username, password } = body

      if (!username || !password) {
        return c.json({ error: 'missing_credentials' }, 400)
      }

      const result = await service.login(username, password)
      return c.json(result)
    } catch (e: any) {
      return c.json({ error: e.message }, 401)
    }
  })

  // Logout
  app.post('/auth/logout', async (c) => {
    const auth = c.req.header('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ ok: true })
    }

    const token = auth.slice(7).trim()
    await service.logout(token)
    return c.json({ ok: true })
  })

  // Request password reset
  app.post('/auth/request-password-reset', async (c) => {
    const body = await c.req.json<PasswordResetRequest>().catch(() => ({} as PasswordResetRequest))
    const { username } = body

    if (!username) {
      return c.json({ ok: true })
    }

    const result = await service.requestPasswordReset(username)
    // Return token for dev; remove in production
    return c.json({ ok: true, resetToken: result.resetToken })
  })

  // Reset password
  app.post('/auth/reset-password', async (c) => {
    try {
      const body = await c.req.json<ResetPasswordRequest>().catch(() => ({} as ResetPasswordRequest))
      const { token, newPassword } = body

      if (!token || !newPassword || newPassword.length < 8) {
        return c.json({ error: 'invalid_request' }, 400)
      }

      await service.resetPassword(token, newPassword)
      return c.json({ ok: true })
    } catch (e: any) {
      return c.json({ error: e.message }, 400)
    }
  })

  // Get current user profile
  app.get('/me', async (c) => {
    const userId = await service.requireAuth(c.req.header('authorization'), c.req.header('x-user'))

    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    const user = await service.getUserById(userId)
    if (!user) {
      return c.json({ error: 'not_found' }, 404)
    }

    return c.json(user)
  })
}
