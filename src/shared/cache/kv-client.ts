export interface CacheOptions {
  expirationTtl?: number
}

/**
 * Wrapper for Cloudflare KV operations
 */
export class KVCache {
  constructor(private kv: KVNamespace) {}

  async get<T = string>(key: string): Promise<T | null> {
    const value = await this.kv.get(key)
    return value as T | null
  }

  async set(key: string, value: string, options?: CacheOptions): Promise<void> {
    await this.kv.put(key, value, options)
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }

  // Session-specific helpers
  sessionKey(token: string): string {
    return `sess:${token}`
  }

  resetKey(token: string): string {
    return `reset:${token}`
  }

  seenKey(userId: string): string {
    return `seen:${userId}`
  }
}
