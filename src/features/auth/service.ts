import { AuthRepository } from './repository'
import { KVCache } from '../../shared/cache/kv-client'
import { scryptHash, verifyPassword } from '../../shared/utils/crypto'
import { normalizeUsername, validatePassword } from '../../shared/utils/validation'
import { APP_CONFIG } from '../../config/constants'
import { Env } from '../../types/env'

export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private kvCache: KVCache,
    private env: Env
  ) {}

  private getSessionTTL(): number {
    const v = Number(this.env.SESSION_TTL_SECONDS || APP_CONFIG.DEFAULT_SESSION_TTL)
    return Number.isFinite(v) && v > 0 ? v : APP_CONFIG.DEFAULT_SESSION_TTL
  }

  async register(username: string, password: string, locale: string = 'en') {
    if (!validatePassword(password)) {
      throw new Error('Password must be at least 8 characters')
    }

    const usernameNorm = normalizeUsername(username)

    // Check for existing user
    const existing = await this.authRepo.findUserByUsername(usernameNorm)
    if (existing) {
      throw new Error('username_taken')
    }

    // Hash password
    const { hashB64, saltB64, algo, params } = await scryptHash(password)

    // Create user
    const id = crypto.randomUUID()
    await this.authRepo.createUserWithPassword(
      id,
      username,
      usernameNorm,
      locale,
      hashB64,
      saltB64,
      algo,
      params
    )

    // Create session
    const token = crypto.randomUUID()
    await this.kvCache.set(this.kvCache.sessionKey(token), id, {
      expirationTtl: this.getSessionTTL(),
    })

    return { userId: id, sessionToken: token }
  }

  async login(username: string, password: string) {
    const usernameNorm = normalizeUsername(username)

    const user = await this.authRepo.findUserByUsername(usernameNorm)
    if (!user || !user.password_hash || !user.password_salt) {
      throw new Error('invalid_login')
    }

    const isValid = await verifyPassword(
      password,
      user.password_hash,
      user.password_salt,
      user.password_params
    )

    if (!isValid) {
      throw new Error('invalid_login')
    }

    // Update last login
    await this.authRepo.updateLastLogin(user.id)

    // Create session
    const token = crypto.randomUUID()
    await this.kvCache.set(this.kvCache.sessionKey(token), user.id, {
      expirationTtl: this.getSessionTTL(),
    })

    return { userId: user.id, sessionToken: token }
  }

  async logout(sessionToken: string): Promise<void> {
    await this.kvCache.delete(this.kvCache.sessionKey(sessionToken))
  }

  async requestPasswordReset(username: string) {
    const usernameNorm = normalizeUsername(username)
    const user = await this.authRepo.findUserByUsername(usernameNorm)

    if (user?.id) {
      const token = crypto.randomUUID()
      await this.kvCache.set(this.kvCache.resetKey(token), user.id, {
        expirationTtl: APP_CONFIG.RESET_TOKEN_TTL_SECONDS,
      })
      return { resetToken: token }
    }

    return { resetToken: null }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!validatePassword(newPassword)) {
      throw new Error('Password must be at least 8 characters')
    }

    const userId = await this.kvCache.get<string>(this.kvCache.resetKey(token))
    if (!userId) {
      throw new Error('invalid_or_expired')
    }

    const { hashB64, saltB64, algo, params } = await scryptHash(newPassword)
    await this.authRepo.updatePassword(userId, hashB64, saltB64, algo, params)
    await this.kvCache.delete(this.kvCache.resetKey(token))
  }

  async getUserBySessionToken(sessionToken: string) {
    const userId = await this.kvCache.get<string>(this.kvCache.sessionKey(sessionToken))
    if (!userId) return null

    return this.authRepo.findById(userId)
  }

  async getUserById(userId: string) {
    return this.authRepo.findById(userId)
  }

  async requireAuth(authHeader: string | undefined, xUserHeader: string | undefined): Promise<string | null> {
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim()
      const userId = await this.kvCache.get<string>(this.kvCache.sessionKey(token))
      if (userId) return userId
      return null
    }

    // Fallback to anonymous header
    return xUserHeader || null
  }
}
