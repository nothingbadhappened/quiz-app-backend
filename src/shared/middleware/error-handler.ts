import { Context, Next } from 'hono'

/**
 * Global error handler middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (error: any) {
    console.error('Unhandled error:', error)
    return c.json(
      {
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
      },
      500
    )
  }
}
