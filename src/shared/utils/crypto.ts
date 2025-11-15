import { scrypt as scryptAsync } from 'scrypt-js'
import { APP_CONFIG } from '../../config/constants'

export interface PasswordHashResult {
  hashB64: string
  saltB64: string
  algo: string
  params: string
}

/**
 * Constant-time comparison for security-sensitive operations
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

/**
 * Hashes a password using scrypt
 */
export async function scryptHash(
  password: string,
  saltB64?: string
): Promise<PasswordHashResult> {
  const enc = new TextEncoder()
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16))

  const N = APP_CONFIG.SCRYPT_N
  const r = APP_CONFIG.SCRYPT_R
  const p = APP_CONFIG.SCRYPT_P
  const dkLen = APP_CONFIG.SCRYPT_DKLEN

  const pw = enc.encode(password)
  const out = new Uint8Array(dkLen)
  // @ts-ignore - scrypt-js type definitions are incorrect for Cloudflare Workers
  await scryptAsync(pw, salt, N, r, p, dkLen, out)

  const hashB64 = btoa(String.fromCharCode(...out))
  const saltOut = btoa(String.fromCharCode(...salt))
  const params = JSON.stringify({ N, r, p, dkLen })

  return { hashB64, saltB64: saltOut, algo: 'scrypt', params }
}

/**
 * Verifies a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashB64: string,
  saltB64: string,
  paramsJson?: string
): Promise<boolean> {
  const { N, r, p, dkLen } = paramsJson
    ? JSON.parse(paramsJson)
    : {
        N: APP_CONFIG.SCRYPT_N,
        r: APP_CONFIG.SCRYPT_R,
        p: APP_CONFIG.SCRYPT_P,
        dkLen: APP_CONFIG.SCRYPT_DKLEN,
      }

  const enc = new TextEncoder()
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
  const out = new Uint8Array(dkLen)
  // @ts-ignore - scrypt-js type definitions are incorrect for Cloudflare Workers
  await scryptAsync(enc.encode(password), salt, N, r, p, dkLen, out)

  const recomputed = btoa(String.fromCharCode(...out))
  return timingSafeEqual(
    Uint8Array.from(atob(hashB64), (c) => c.charCodeAt(0)),
    Uint8Array.from(atob(recomputed), (c) => c.charCodeAt(0))
  )
}
