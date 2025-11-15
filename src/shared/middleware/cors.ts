import { cors } from 'hono/cors'

/**
 * CORS middleware configuration for the app
 */
export const corsMiddleware = cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['*'],
  exposeHeaders: ['*'],
  maxAge: 86400,
})
