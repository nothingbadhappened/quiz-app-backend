import { Context, Next } from 'hono'
import { AuthService } from './service'

/**
 * Middleware to require authentication
 */
export function requireAuth(authService: AuthService) {
  return async (c: Context, next: Next) => {
    const userId = await authService.requireAuth(
      c.req.header('authorization'),
      c.req.header('x-user')
    )

    if (!userId) {
      return c.json({ error: 'unauthorized' }, 401)
    }

    // Attach userId to context
    c.set('userId', userId)
    await next()
  }
}
