import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { v4 as uuid } from 'uuid'

type Env = {
  DB: D1Database
  KV: KVNamespace
  OPENAI_API_KEY: string
  ADMIN_KEY: string
}

type QuestionRow = {
  id: string
  prompt: string
  options: string
  correct_idx: number
  category?: string
  difficulty?: string // "1".."6" or text in your seed
  lang?: string
}

const app = new Hono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['*'],
    exposeHeaders: ['*'],
    maxAge: 86400,
  })
)
app.options('*', (c) => c.text('', 204))

/** ---------- Helpers ---------- */

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function speedBucket(ms?: number) {
  if (ms == null) return 'normal'
  if (ms <= 5000) return 'fast'
  if (ms <= 12000) return 'normal'
  return 'slow'
}

function calcScore(deltaCorrect: boolean, difficulty: number, tMs?: number, streakBefore?: number) {
  if (!deltaCorrect) return 0
  const base = 100 * difficulty
  const t = (tMs ?? 15000) / 1000
  const speedBonusPct = Math.min(0.3, 0.3 * Math.exp(-t / 8))
  const streakMultPct = Math.min(0.5, 0.1 * Math.max(0, (streakBefore ?? 0)))
  return Math.round(base * (1 + speedBonusPct + streakMultPct))
}

function updateMu(mu: number, correct: boolean, tMs?: number) {
  const sp = speedBucket(tMs)
  const deltas = {
    correct: { fast: 0.30, normal: 0.20, slow: 0.10 },
    wrong:   { fast: -0.30, normal: -0.20, slow: -0.10 },
  }
  const d = correct ? deltas.correct[sp] : deltas.wrong[sp]
  return clamp(mu + d, 1.0, 6.0)
}

function targetDifficulty(mu: number) {
  return clamp(Math.round(mu), 1, 6)
}

function toDiff(row: Partial<QuestionRow>) {
  const raw = (row.difficulty ?? '3').toString()
  const n = parseInt(raw, 10)
  return clamp(isNaN(n) ? 3 : n, 1, 6)
}

function parseJSON<T = any>(s: string): T {
  try { return JSON.parse(s) } catch { return [] as any }
}

/** ---------- Auth / Register ---------- */

app.post('/register', async (c) => {
  try {
    const { username: requestedUsername, locale = 'en' } = await c.req.json()
    const id = uuid()

    // For guest users, generate unique username with random suffix if collision occurs
    let username = requestedUsername || `Guest_${id.slice(0, 8)}`
    let attempts = 0
    const maxAttempts = 5

    while (attempts < maxAttempts) {
      try {
        await c.env.DB.batch([
          c.env.DB.prepare('INSERT INTO user (id, username, locale) VALUES (?, ?, ?)').bind(id, username, locale),
          c.env.DB.prepare('INSERT OR IGNORE INTO user_skill (user_id, mu) VALUES (?, 3.0)').bind(id),
          c.env.DB.prepare('INSERT OR IGNORE INTO streak_state (user_id, current_streak, best_streak) VALUES (?, 0, 0)').bind(id),
        ])
        break // Success
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed: user.username')) {
          attempts++
          username = `${requestedUsername || 'Guest'}_${Math.random().toString(36).substring(2, 8)}`
          if (attempts >= maxAttempts) throw e
        } else {
          throw e
        }
      }
    }

    return c.json({ userId: id, token: id })
  } catch (e: any) {
    console.error('REGISTER_ERROR', e.message, e.stack)
    return c.json({ error: e.message }, 500)
  }
})


/** ---------- Sessions ---------- */

app.post('/session/start', async (c) => {
  const userId = c.req.header('x-user') || ''
  const { mode } = await c.req.json<{ mode: 'run' | 'endless' | 'daily' }>()
  const sessionId = uuid()

  await c.env.DB.prepare(
    'INSERT INTO run_session (id, user_id, mode) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, mode).run()

  return c.json({ sessionId })
})

app.post('/session/finish', async (c) => {
  const userId = c.req.header('x-user') || ''
  const { sessionId } = await c.req.json<{ sessionId: string }>()

  await c.env.DB.prepare(
    `UPDATE run_session
     SET ended_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND ended_at IS NULL`
  ).bind(sessionId, userId).run()

  const row = await c.env.DB.prepare(
    `SELECT score, max_streak FROM run_session WHERE id = ? AND user_id = ?`
  ).bind(sessionId, userId).first<{ score: number, max_streak: number }>()

  return c.json({ score: row?.score ?? 0, maxStreak: row?.max_streak ?? 0 })
})

/** ---------- Next Questions (adaptive & unseen-first) ---------- */

app.get('/quiz/next', async (c) => {
  const userId = c.req.header('x-user') || ''
  const lang = c.req.query('lang') ?? 'en'
  const category = c.req.query('cat') ?? 'general'
  const n = Number(c.req.query('n') ?? 10)

  const skill = await c.env.DB.prepare('SELECT mu FROM user_skill WHERE user_id = ?').bind(userId).first<{ mu: number }>()
  const mu = skill?.mu ?? 3.0
  const dTarget = targetDifficulty(mu)

  const over = n * 5
  let { results } = await c.env.DB.prepare(
    `SELECT id, prompt, options, correct_idx, category, difficulty, lang
     FROM question
     WHERE lang = ? AND category = ? AND CAST(difficulty AS INTEGER) BETWEEN ? AND ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).bind(lang, category, Math.max(1, dTarget - 1), Math.min(6, dTarget + 1), over).all<QuestionRow>()

  // Fallback: if no questions match target difficulty, get any questions from lang+category
  if (results.length === 0) {
    const fallback = await c.env.DB.prepare(
      `SELECT id, prompt, options, correct_idx, category, difficulty, lang
       FROM question
       WHERE lang = ? AND category = ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(lang, category, over).all<QuestionRow>()
    results = fallback.results
  }

  // Fallback 2: if still no questions, get ANY questions from lang
  if (results.length === 0) {
    const fallback2 = await c.env.DB.prepare(
      `SELECT id, prompt, options, correct_idx, category, difficulty, lang
       FROM question
       WHERE lang = ?
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(lang, over).all<QuestionRow>()
    results = fallback2.results
  }

  const seenRaw = await c.env.KV.get(`seen:${userId}`)
  const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : [])

  const fresh: Array<{ id: string, prompt: string, options: string[] }> = []
  for (const q of results) {
    if (!seen.has(q.id)) {
      fresh.push({ id: q.id, prompt: q.prompt, options: parseJSON<string[]>(q.options) })
      if (fresh.length >= n) break
    }
  }

  if (fresh.length < n) {
    for (const q of results) {
      if (fresh.find(x => x.id === q.id)) continue
      fresh.push({ id: q.id, prompt: q.prompt, options: parseJSON<string[]>(q.options) })
      if (fresh.length >= n) break
    }
  }

  return c.json({ items: fresh })
})

/** ---------- Answer (adaptive μ, scoring, streaks, seen) ---------- */

app.post('/quiz/answer', async (c) => {
  const userId = c.req.header('x-user') || ''
  const { questionId, selectedIdx, timeMs, sessionId } = await c.req.json() as {
    questionId: string, selectedIdx: number, timeMs?: number, sessionId?: string
  }

  const q = await c.env.DB.prepare(
    'SELECT difficulty, category, correct_idx FROM question WHERE id = ?'
  ).bind(questionId).first<{ difficulty?: string, category?: string, correct_idx?: number }>()

  if (!q) {
    return c.json({ error: 'question_not_found' }, 404)
  }

  // Both database and frontend use 0-based indexing
  const correct = selectedIdx === q.correct_idx
  const d = clamp(parseInt(q?.difficulty ?? '3', 10) || 3, 1, 6)

  const rowSkill = await c.env.DB.prepare(
    'SELECT mu FROM user_skill WHERE user_id = ?'
  ).bind(userId).first<{ mu: number }>()
  const mu = rowSkill?.mu ?? 3.0

  const rowStreak = await c.env.DB.prepare(
    'SELECT current_streak, best_streak FROM streak_state WHERE user_id = ?'
  ).bind(userId).first<{ current_streak: number, best_streak: number }>()

  const curStreak = rowStreak?.current_streak ?? 0
  const newScore = calcScore(correct, d, timeMs, curStreak)

  const nextStreak = correct ? curStreak + 1 : 0
  const nextBest = Math.max(rowStreak?.best_streak ?? 0, nextStreak)

  const nextMu = updateMu(mu, !!correct, timeMs)

  const statements: D1PreparedStatement[] = [
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO user_answer (user_id, question_id, correct) VALUES (?, ?, ?)'
    ).bind(userId, questionId, correct ? 1 : 0),

    c.env.DB.prepare(
      'INSERT OR REPLACE INTO user_skill (user_id, mu, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).bind(userId, nextMu),

    c.env.DB.prepare(
      'INSERT OR REPLACE INTO streak_state (user_id, current_streak, best_streak, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(userId, nextStreak, nextBest),
  ]

  if (sessionId) {
    statements.push(
      c.env.DB.prepare(
        'UPDATE run_session SET score = score + ?, max_streak = MAX(max_streak, ?) WHERE id = ? AND user_id = ?'
      ).bind(newScore, nextStreak, sessionId, userId)
    )
  }

  await c.env.DB.batch(statements)

  const seenRaw = await c.env.KV.get(`seen:${userId}`)
  const arr: string[] = seenRaw ? JSON.parse(seenRaw) : []
  if (!arr.includes(questionId)) arr.push(questionId)
  await c.env.KV.put(`seen:${userId}`, JSON.stringify(arr), { expirationTtl: 60 * 60 * 24 * 30 })

if (q?.category) {
  const delta = correct ? 0.2 : -0.05
  const current = await c.env.DB
    .prepare('SELECT weight FROM topic_pref WHERE user_id = ? AND topic = ?')
    .bind(userId, q.category)
    .first<{ weight: number }>()
  const next = Math.max(-5, Math.min(5, (current?.weight ?? 0) + delta))
  await c.env.DB.prepare(
    `INSERT INTO topic_pref(user_id, topic, weight)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, topic) DO UPDATE SET weight = ?`
  ).bind(userId, q.category, next, next).run()
}


  return c.json({ ok: true, correct, addedScore: newScore, newMu: nextMu, streak: { current: nextStreak, best: nextBest } })
})

/** ---------- Health ---------- */
app.get('/health', (c) => c.json({ ok: true }))

/** ---------- Generator (OpenAI) ---------- */

type GenItem = {
  lang: string
  region: string
  category: string
  difficulty: number
  prompt: string
  options: string[]
  correct_idx: number
  sources: Array<{ url: string, title?: string }>
}

async function callOpenAI(apiKey: string, messages: any[], maxTokens = 4000) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'text' },
      messages,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  return res.text() // JSONL blob
}

function normalizeHash(lang: string, category: string, prompt: string) {
  const p = prompt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  return `${lang}:${category}:${p}`.slice(0, 240)
}

async function lightVerify(url: string, answerSnippet: string): Promise<{ ok: boolean; title?: string }> {
  try {
    const r = await fetch(url, { method: 'GET', cf: { cacheTtl: 3600 } })
    if (!r.ok) return { ok: false }
    const html = await r.text()
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim()
    const ok = !!title && title.toLowerCase().includes(answerSnippet.toLowerCase().slice(0, 30))
    return { ok, title }
  } catch { return { ok: false } }
}

async function insertBatch(c: any, lang: string, region: string, items: GenItem[]) {
  const stmts: D1PreparedStatement[] = []
  for (const it of items) {
    if (!it.options?.length || it.correct_idx < 1 || it.correct_idx > it.options.length) continue
    const prompt = it.prompt.trim()
    const normHash = normalizeHash(it.lang, it.category, prompt)
    const ans = it.options[it.correct_idx - 1]

    let verified = 0
    let sourceTitles: string[] = []
    if (it.sources?.length) {
      const v = await lightVerify(it.sources[0].url, ans)
      verified = v.ok ? 1 : 0
      sourceTitles = it.sources.map(s => s.title || (s.url === it.sources[0].url ? v.title : ''))
    }

    stmts.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO question
         (id, lang, category, difficulty, prompt, options, correct_idx, normalized_hash, source_urls, source_titles, region, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        it.lang,
        it.category,
        String(Math.max(1, Math.min(6, Math.floor(it.difficulty)))),
        prompt,
        JSON.stringify(it.options),
        it.correct_idx,
        normHash,
        JSON.stringify(it.sources?.map(s => s.url) || []),
        JSON.stringify(sourceTitles),
        it.region || region || 'global',
        verified
      )
    )
  }
  if (stmts.length) await c.env.DB.batch(stmts)
  return stmts.length
}

async function generateAndIngest(c: any, opts: { langs: string[], regions: string[], count: number }) {
  const sys = `You are a rigorous multilingual trivia data writer.
Return ONLY valid JSON Lines (one JSON object per line).
No explanations. Family-friendly. Stable facts. 4 options. 1-based correct_idx. Include 1–3 reputable sources.`
  const usr = `Generate ${opts.count} multiple-choice trivia items for:
- languages: ${JSON.stringify(opts.langs)}
- target regions: ${JSON.stringify(opts.regions)}
- allowed categories: ["general","science","history","geography","tech","movies","music","sports","literature","nature","popculture","logic","math"]
- difficulty distribution: {"1":15,"2":25,"3":25,"4":20,"5":10,"6":5}

Rules:
- Use the appropriate language for each item.
- Add region-specific items where relevant; otherwise region="global".
- Avoid time-sensitive or contentious topics.
- Include 1–3 reputable sources per item.
Output STRICT JSONL with keys:
lang, region, category, difficulty, prompt, options, correct_idx, sources[{url,title}].
Return exactly ${opts.count} lines.`

  const text = await callOpenAI(c.env.OPENAI_API_KEY, [
    { role: 'system', content: sys },
    { role: 'user', content: usr },
  ], 16000)

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const parsed: GenItem[] = []
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)) } catch { /* skip */ }
  }

  const byLang = new Map<string, GenItem[]>()
  for (const it of parsed) {
    if (!byLang.has(it.lang)) byLang.set(it.lang, [])
    byLang.get(it.lang)!.push(it)
  }

  let inserted = 0
  for (const [lang, arr] of byLang) {
    inserted += await insertBatch({ env: c.env }, lang, 'global', arr)
  }
  return { requested: opts.count, parsed: parsed.length, inserted }
}

/** ---------- Admin endpoint ---------- */

app.post('/admin/generate', async (c) => {
  const auth = c.req.header('authorization') || ''
  if (auth !== `Bearer ${c.env.ADMIN_KEY}`) return c.json({ error: 'unauthorized' }, 401)

  const { langs = ['en', 'ru'], regions = ['global'], count = 1000 } = (await c.req.json().catch(() => ({}))) as any
  try {
    const out = await generateAndIngest(c, { langs, regions, count: Math.min(2000, Number(count) || 1000) })
    return c.json({ ok: true, ...out })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message })
  }
})

// === AUTH ADDITIONS START ===
import { scrypt as scryptAsync } from 'scrypt-js'

function normUsername(u: string) {
  return u.trim().toLowerCase()
}

async function scryptHash(password: string, saltB64?: string) {
  const enc = new TextEncoder()
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16))
  const N = 2 ** 15, r = 8, p = 1, dkLen = 32
  const pw = enc.encode(password)
  const out = new Uint8Array(dkLen)
  await scryptAsync(pw, salt, N, r, p, dkLen, out)
  const hashB64 = btoa(String.fromCharCode(...out))
  const saltOut = btoa(String.fromCharCode(...salt))
  const params = JSON.stringify({ N, r, p, dkLen })
  return { hashB64, saltB64: saltOut, algo: 'scrypt', params }
}

async function verifyPassword(password: string, hashB64: string, saltB64: string, paramsJson?: string) {
  const { N, r, p, dkLen } = paramsJson ? JSON.parse(paramsJson) : { N: 2 ** 15, r: 8, p: 1, dkLen: 32 }
  const enc = new TextEncoder()
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const out = new Uint8Array(dkLen)
  await scryptAsync(enc.encode(password), salt, N, r, p, dkLen, out)
  const recomputed = btoa(String.fromCharCode(...out))
  return crypto.timingSafeEqual(Uint8Array.from(atob(hashB64), c => c.charCodeAt(0)), Uint8Array.from(atob(recomputed), c => c.charCodeAt(0)))
}

// sessions in KV: key = sess:<token> → userId (TTL)
function sessionKey(t: string) { return `sess:${t}` }
function resetKey(t: string) { return `reset:${t}` }

function getSessionTTL(env: Env) {
  const v = Number(env.SESSION_TTL_SECONDS || '2592000') // 30d default
  return Number.isFinite(v) && v > 0 ? v : 2592000
}

async function requireAuth(c: any) {
  const auth = c.req.header('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    const userId = await c.env.KV.get(sessionKey(token))
    if (userId) return userId
    return null
  }
  // fallback to current anonymous header
  const uid = c.req.header('x-user')
  return uid || null
}

// --- /auth/register (username+password) ---
app.post('/auth/register', async (c) => {
  const { username, password, locale = 'en' } = await c.req.json().catch(() => ({}))
  if (!username || !password || String(password).length < 8) {
    return c.json({ error: 'username and password(>=8) required' }, 400)
  }
  const unameNorm = normUsername(String(username))

  // duplicate check
  const existing = await c.env.DB
    .prepare('SELECT id FROM user WHERE username_norm = ?')
    .bind(unameNorm)
    .first<{ id: string }>()
  if (existing) return c.json({ error: 'username_taken' }, 409)

  const { hashB64, saltB64, algo, params } = await scryptHash(String(password))
  const id = crypto.randomUUID()

  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO user (id, username, username_norm, locale, password_hash, password_salt, password_algo, password_params, password_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .bind(id, String(username), unameNorm, String(locale), hashB64, saltB64, algo, params),
    c.env.DB.prepare('INSERT OR IGNORE INTO user_skill (user_id, mu) VALUES (?, 3.0)').bind(id),
    c.env.DB.prepare('INSERT OR IGNORE INTO streak_state (user_id, current_streak, best_streak) VALUES (?, 0, 0)').bind(id),
  ])

  // create session
  const token = crypto.randomUUID()
  await c.env.KV.put(sessionKey(token), id, { expirationTtl: getSessionTTL(c.env) })

  return c.json({ userId: id, sessionToken: token })
})

// --- /auth/login ---
app.post('/auth/login', async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}))
  if (!username || !password) return c.json({ error: 'missing_credentials' }, 400)

  const unameNorm = normUsername(String(username))
  const row = await c.env.DB
    .prepare('SELECT id, password_hash, password_salt, password_params FROM user WHERE username_norm = ?')
    .bind(unameNorm)
    .first<{ id: string, password_hash: string, password_salt: string, password_params: string }>()
  if (!row) return c.json({ error: 'invalid_login' }, 401)

  const ok = await verifyPassword(String(password), row.password_hash, row.password_salt, row.password_params)
  if (!ok) return c.json({ error: 'invalid_login' }, 401)

  await c.env.DB.prepare('UPDATE user SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?').bind(row.id).run()

  const token = crypto.randomUUID()
  await c.env.KV.put(sessionKey(token), row.id, { expirationTtl: getSessionTTL(c.env) })
  return c.json({ userId: row.id, sessionToken: token })
})

// --- /auth/logout ---
app.post('/auth/logout', async (c) => {
  const auth = c.req.header('authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ ok: true }) // idempotent
  const token = auth.slice(7).trim()
  await c.env.KV.delete(sessionKey(token))
  return c.json({ ok: true })
})

// --- /auth/request-password-reset ---
app.post('/auth/request-password-reset', async (c) => {
  const { username } = await c.req.json().catch(() => ({}))
  if (!username) return c.json({ ok: true }) // don’t leak existence

  const unameNorm = normUsername(String(username))
  const row = await c.env.DB
    .prepare('SELECT id FROM user WHERE username_norm = ?')
    .bind(unameNorm)
    .first<{ id: string }>()
  if (row?.id) {
    const token = crypto.randomUUID()
    // 15 minutes
    await c.env.KV.put(resetKey(token), row.id, { expirationTtl: 900 })
    // TODO: send email/SMS here. For MVP/dev we can return token below.
    return c.json({ ok: true, resetToken: token }) // return token for dev; remove in prod
  }
  return c.json({ ok: true })
})

// --- /auth/reset-password ---
app.post('/auth/reset-password', async (c) => {
  const { token, newPassword } = await c.req.json().catch(() => ({}))
  if (!token || !newPassword || String(newPassword).length < 8) {
    return c.json({ error: 'invalid_request' }, 400)
  }
  const userId = await c.env.KV.get(resetKey(String(token)))
  if (!userId) return c.json({ error: 'invalid_or_expired' }, 400)

  const { hashB64, saltB64, algo, params } = await scryptHash(String(newPassword))
  await c.env.DB.prepare(
    `UPDATE user
     SET password_hash = ?, password_salt = ?, password_algo = ?, password_params = ?, password_updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(hashB64, saltB64, algo, params, userId).run()

  await c.env.KV.delete(resetKey(String(token)))

  // Optionally revoke all sessions: scan isn’t cheap in KV; we skip for MVP

  return c.json({ ok: true })
})

// --- /me (auth via Bearer or x-user) ---
app.get('/me', async (c) => {
  const userId = await requireAuth(c)
  if (!userId) return c.json({ error: 'unauthorized' }, 401)
  const row = await c.env.DB
    .prepare('SELECT id, username, locale, last_login_at FROM user WHERE id = ?')
    .bind(userId)
    .first<{ id: string, username: string, locale: string, last_login_at: string | null }>()
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(row)
})
// === AUTH ADDITIONS END ===


/** ---------- Export fetch + cron (scheduled) ---------- */

export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    // Nightly generation: add 100 new questions per night
    // Goal: reach 100k questions per language across all difficulties
    const langs = ['en', 'ru']           // extend later with es, pt-BR, fr, de, it, hi, etc.
    const regions = ['global']           // add 'RU','US','IN','MX','BR','EU' later
    const nightlyTarget = 100            // generate 100 questions per night
    const maxTotalPerLang = 100_000      // stop when reaching 100k per language

    try {
      // Check current count for each language
      for (const lang of langs) {
        const countResult = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM question WHERE lang = ?'
        ).bind(lang).first<{ count: number }>()

        const currentCount = countResult?.count ?? 0

        // Skip if we've already reached the target for this language
        if (currentCount >= maxTotalPerLang) {
          console.log(`[CRON] Language ${lang} already has ${currentCount} questions (target: ${maxTotalPerLang}). Skipping.`)
          continue
        }

        const remaining = maxTotalPerLang - currentCount
        const toGenerate = Math.min(nightlyTarget, remaining)

        console.log(`[CRON] Generating ${toGenerate} questions for ${lang} (current: ${currentCount}/${maxTotalPerLang})`)

        const { inserted } = await generateAndIngest({ env }, { langs: [lang], regions, count: toGenerate })
        console.log(`[CRON] Successfully inserted ${inserted} questions for ${lang}`)
      }
    } catch (e: any) {
      console.error('[CRON] Failed:', e.message)
    }
  }
}
