export interface Env {
  DB: D1Database
  KV: KVNamespace
  OPENAI_API_KEY: string
  ADMIN_KEY: string
  SESSION_TTL_SECONDS?: string
  NIGHTLY_TARGET?: string
  MAX_TOTAL_QUESTIONS?: string
}
