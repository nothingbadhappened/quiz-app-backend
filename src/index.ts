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
  const { sessionId, questions, finalScore, maxStreak } = await c.req.json<{
    sessionId: string
    questions: Array<{
      questionId: string
      selectedIdx: number
      timeMs: number
      difficulty: number
      category: string
      correct: boolean
    }>
    finalScore: number
    maxStreak: number
  }>()

  console.log('[/session/finish] Processing session:', sessionId, 'Questions:', questions.length, 'Score:', finalScore, 'MaxStreak:', maxStreak)

  // Get current user skill and streak state
  const rowSkill = await c.env.DB.prepare(
    'SELECT mu FROM user_skill WHERE user_id = ?'
  ).bind(userId).first<{ mu: number }>()
  let currentMu = rowSkill?.mu ?? 3.0

  // Update skill level based on all answers
  for (const q of questions) {
    currentMu = updateMu(currentMu, q.correct, q.timeMs)
  }

  // Prepare batch statements
  const statements: D1PreparedStatement[] = []

  // Update user skill with final mu
  statements.push(
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO user_skill (user_id, mu, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
    ).bind(userId, currentMu)
  )

  // Update streak state
  statements.push(
    c.env.DB.prepare(
      'INSERT OR REPLACE INTO streak_state (user_id, current_streak, best_streak, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
    ).bind(userId, 0, maxStreak) // Reset current streak after session, update best
  )

  // Record all answers
  for (const q of questions) {
    statements.push(
      c.env.DB.prepare(
        'INSERT OR REPLACE INTO user_answer (user_id, question_id, correct) VALUES (?, ?, ?)'
      ).bind(userId, q.questionId, q.correct ? 1 : 0)
    )
  }

  // Update run_session with final scores
  statements.push(
    c.env.DB.prepare(
      `UPDATE run_session
       SET score = ?, max_streak = ?, ended_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND ended_at IS NULL`
    ).bind(finalScore, maxStreak, sessionId, userId)
  )

  // Execute all database updates in batch
  await c.env.DB.batch(statements)

  // Mark all questions as seen in KV
  const seenRaw = await c.env.KV.get(`seen:${userId}`)
  const seenArr: string[] = seenRaw ? JSON.parse(seenRaw) : []
  for (const q of questions) {
    if (!seenArr.includes(q.questionId)) {
      seenArr.push(q.questionId)
    }
  }
  await c.env.KV.put(`seen:${userId}`, JSON.stringify(seenArr), { expirationTtl: 60 * 60 * 24 * 30 })

  // Update topic preferences for each category
  const categoryUpdates: D1PreparedStatement[] = []
  const categoryScores = new Map<string, { correct: number, total: number }>()

  for (const q of questions) {
    const current = categoryScores.get(q.category) || { correct: 0, total: 0 }
    categoryScores.set(q.category, {
      correct: current.correct + (q.correct ? 1 : 0),
      total: current.total + 1
    })
  }

  for (const [category, stats] of categoryScores) {
    const accuracy = stats.correct / stats.total
    const delta = accuracy > 0.7 ? 0.2 : (accuracy < 0.3 ? -0.2 : 0)

    const current = await c.env.DB
      .prepare('SELECT weight FROM topic_pref WHERE user_id = ? AND topic = ?')
      .bind(userId, category)
      .first<{ weight: number }>()

    const next = Math.max(-5, Math.min(5, (current?.weight ?? 0) + delta))
    categoryUpdates.push(
      c.env.DB.prepare(
        `INSERT INTO topic_pref(user_id, topic, weight)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, topic) DO UPDATE SET weight = ?`
      ).bind(userId, category, next, next)
    )
  }

  if (categoryUpdates.length > 0) {
    await c.env.DB.batch(categoryUpdates)
  }

  console.log('[/session/finish] Session completed. Final mu:', currentMu, 'Seen questions:', seenArr.length)

  return c.json({ ok: true, score: finalScore, maxStreak, newMu: currentMu })
})

/** ---------- Next Questions (adaptive & unseen-first) ---------- */

// Helper to fetch questions from new translation structure with English fallback
async function fetchTranslatedQuestions(
  db: D1Database,
  lang: string,
  category: string,
  minDiff: number,
  maxDiff: number,
  limit: number
): Promise<Array<{ id: string, prompt: string, options: string, difficulty: number, correct_idx: number }>> {
  // Try to get questions in requested language
  let { results } = await db.prepare(
    `SELECT qb.id as id, qt.prompt, qt.options, qt.correct_idx, qb.difficulty
     FROM question_base qb
     INNER JOIN question_translation qt ON qb.id = qt.base_id
     WHERE qt.lang = ? AND qb.category = ? AND qb.difficulty BETWEEN ? AND ?
     ORDER BY qb.difficulty ASC, qb.created_at DESC
     LIMIT ?`
  ).bind(lang, category, minDiff, maxDiff, limit).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()

  // Fallback to English if requested language has no results and lang != 'en'
  if (results.length === 0 && lang !== 'en') {
    const fallback = await db.prepare(
      `SELECT qb.id as id, qt.prompt, qt.options, qt.correct_idx, qb.difficulty
       FROM question_base qb
       INNER JOIN question_translation qt ON qb.id = qt.base_id
       WHERE qt.lang = 'en' AND qb.category = ? AND qb.difficulty BETWEEN ? AND ?
       ORDER BY qb.difficulty ASC, qb.created_at DESC
       LIMIT ?`
    ).bind(category, minDiff, maxDiff, limit).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()
    results = fallback.results
  }

  return results
}

app.get('/quiz/next', async (c) => {
  const userId = c.req.header('x-user') || ''
  const lang = c.req.query('lang') ?? 'en'
  const category = c.req.query('cat') ?? 'general'
  const n = Number(c.req.query('n') ?? 10)
  // NEW: Accept recent performance to adapt difficulty
  const recentPerf = Number(c.req.query('recentPerf') ?? 0.5)

  console.log('[/quiz/next] Request params:', { lang, category, n, userId, recentPerf })

  const skill = await c.env.DB.prepare('SELECT mu FROM user_skill WHERE user_id = ?').bind(userId).first<{ mu: number }>()
  const mu = skill?.mu ?? 3.0
  const dTarget = targetDifficulty(mu)

  // Adaptive difficulty range based on recent performance
  let minDiff: number, maxDiff: number
  if (recentPerf < 0.4) {
    // Struggling: Focus on easier questions
    minDiff = Math.max(1, dTarget - 2)
    maxDiff = dTarget
  } else if (recentPerf > 0.7) {
    // Doing well: Include more challenging questions
    minDiff = dTarget
    maxDiff = Math.min(6, dTarget + 2)
  } else {
    // Average: Balanced progression
    minDiff = Math.max(1, dTarget - 1)
    maxDiff = Math.min(6, dTarget + 1)
  }

  const over = n * 5
  let allQuestions: Array<{ id: string, prompt: string, options: string, difficulty: number, correct_idx: number }> = []

  // Try new translation structure first
  console.log('[/quiz/next] Fetching questions with:', { lang, category, minDiff, maxDiff, limit: over })
  const newQuestions = await fetchTranslatedQuestions(c.env.DB, lang, category, minDiff, maxDiff, over)
  console.log('[/quiz/next] Got', newQuestions.length, 'questions from new structure')
  if (newQuestions.length > 0) {
    console.log('[/quiz/next] First question:', newQuestions[0].prompt.substring(0, 50))
  }
  allQuestions.push(...newQuestions)

  // Fallback to old question table for backward compatibility
  if (allQuestions.length < over) {
    let { results } = await c.env.DB.prepare(
      `SELECT id, prompt, options, correct_idx, difficulty
       FROM question
       WHERE lang = ? AND category = ? AND CAST(difficulty AS INTEGER) BETWEEN ? AND ?
       ORDER BY CAST(difficulty AS INTEGER) ASC, created_at DESC
       LIMIT ?`
    ).bind(lang, category, minDiff, maxDiff, over - allQuestions.length).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()

    // If still no results and lang != 'en', try English from old table
    if (results.length === 0 && lang !== 'en') {
      const fallback = await c.env.DB.prepare(
        `SELECT id, prompt, options, correct_idx, difficulty
         FROM question
         WHERE lang = 'en' AND category = ? AND CAST(difficulty AS INTEGER) BETWEEN ? AND ?
         ORDER BY CAST(difficulty AS INTEGER) ASC, created_at DESC
         LIMIT ?`
      ).bind(category, minDiff, maxDiff, over - allQuestions.length).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()
      results = fallback.results
    }

    allQuestions.push(...results)
  }

  // If still not enough questions, progressively widen difficulty range
  let expandRange = 1
  while (allQuestions.length < n && expandRange <= 3) {
    const widerMin = Math.max(1, minDiff - expandRange)
    const widerMax = Math.min(6, maxDiff + expandRange)
    console.log('[/quiz/next] Widening difficulty range to', widerMin, '-', widerMax, 'Need', n - allQuestions.length, 'more questions')

    // Try new structure with wider range
    const widerNew = await fetchTranslatedQuestions(c.env.DB, lang, category, widerMin, widerMax, n - allQuestions.length)
    for (const q of widerNew) {
      if (!allQuestions.find(existing => existing.id === q.id)) {
        allQuestions.push(q)
      }
    }

    // Try old structure with wider range
    if (allQuestions.length < n) {
      let { results } = await c.env.DB.prepare(
        `SELECT id, prompt, options, correct_idx, difficulty
         FROM question
         WHERE lang = ? AND category = ? AND CAST(difficulty AS INTEGER) BETWEEN ? AND ?
         ORDER BY CAST(difficulty AS INTEGER) ASC, created_at DESC
         LIMIT ?`
      ).bind(lang, category, widerMin, widerMax, n - allQuestions.length).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()

      // English fallback
      if (results.length === 0 && lang !== 'en') {
        const fallback = await c.env.DB.prepare(
          `SELECT id, prompt, options, correct_idx, difficulty
           FROM question
           WHERE lang = 'en' AND category = ? AND CAST(difficulty AS INTEGER) BETWEEN ? AND ?
           ORDER BY CAST(difficulty AS INTEGER) ASC, created_at DESC
           LIMIT ?`
        ).bind(category, widerMin, widerMax, n - allQuestions.length).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()
        results = fallback.results
      }

      for (const q of results) {
        if (!allQuestions.find(existing => existing.id === q.id)) {
          allQuestions.push(q)
        }
      }
    }

    expandRange++
  }

  // Final fallback: any category, any difficulty, requested language
  if (allQuestions.length < n) {
    console.log('[/quiz/next] Final fallback: any category, any difficulty')
    const fallback = await c.env.DB.prepare(
      `SELECT id, prompt, options, correct_idx, difficulty FROM question
       WHERE lang = ?
       ORDER BY CAST(difficulty AS INTEGER) ASC, created_at DESC
       LIMIT ?`
    ).bind(lang, n - allQuestions.length).all<{ id: string, prompt: string, options: string, correct_idx: number, difficulty: number }>()
    for (const q of fallback.results) {
      if (!allQuestions.find(existing => existing.id === q.id)) {
        allQuestions.push(q)
      }
    }
  }

  const seenRaw = await c.env.KV.get(`seen:${userId}`)
  const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : [])

  // Sort questions by difficulty for progressive difficulty curve
  const sortedByDifficulty = allQuestions.map(q => ({
    ...q,
    difficultyNum: typeof q.difficulty === 'number' ? q.difficulty : parseInt(String(q.difficulty), 10) || 3
  })).sort((a, b) => a.difficultyNum - b.difficultyNum)

  // Select questions with progressive difficulty, prioritizing unseen
  const fresh: Array<{ id: string, prompt: string, options: string[], correct_idx: number, difficulty: number, category: string }> = []

  // First pass: unseen questions in order of difficulty
  for (const q of sortedByDifficulty) {
    if (!seen.has(q.id)) {
      fresh.push({
        id: q.id,
        prompt: q.prompt,
        options: parseJSON<string[]>(q.options),
        correct_idx: q.correct_idx,
        difficulty: q.difficultyNum,
        category: 'general' // TODO: Extract category from database when available
      })
      if (fresh.length >= n) break
    }
  }

  // Second pass: fill remaining with seen questions if needed
  if (fresh.length < n) {
    for (const q of sortedByDifficulty) {
      if (fresh.find(x => x.id === q.id)) continue
      fresh.push({
        id: q.id,
        prompt: q.prompt,
        options: parseJSON<string[]>(q.options),
        correct_idx: q.correct_idx,
        difficulty: q.difficultyNum,
        category: 'general' // TODO: Extract category from database when available
      })
      if (fresh.length >= n) break
    }
  }

  return c.json({ items: fresh })
})

/** ---------- Answer (adaptive μ, scoring, streaks, seen) ---------- */
/** NOTE: This endpoint is deprecated in favor of client-side validation.
 *  All answer processing now happens in /session/finish endpoint.
 *  Keeping this code commented for potential rollback.
 */

/*
app.post('/quiz/answer', async (c) => {
  const userId = c.req.header('x-user') || ''
  const { questionId, selectedIdx, timeMs, sessionId } = await c.req.json() as {
    questionId: string, selectedIdx: number, timeMs?: number, sessionId?: string
  }

  // Try new translation structure first
  let q = await c.env.DB.prepare(
    `SELECT qb.difficulty, qb.category, qt.correct_idx
     FROM question_base qb
     INNER JOIN question_translation qt ON qb.id = qt.base_id
     WHERE qb.id = ?
     LIMIT 1`
  ).bind(questionId).first<{ difficulty?: number, category?: string, correct_idx?: number }>()

  // Fallback to old question table
  if (!q) {
    q = await c.env.DB.prepare(
      'SELECT difficulty, category, correct_idx FROM question WHERE id = ?'
    ).bind(questionId).first<{ difficulty?: string | number, category?: string, correct_idx?: number }>()
  }

  if (!q) {
    return c.json({ error: 'question_not_found' }, 404)
  }

  // Both database and frontend use 0-based indexing
  const correct = selectedIdx === q.correct_idx
  const d = clamp(typeof q.difficulty === 'number' ? q.difficulty : parseInt(String(q.difficulty ?? '3'), 10) || 3, 1, 6)

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
*/

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
  group_id?: string // NEW: Explicit grouping ID for translations
}

async function callOpenAI(apiKey: string, messages: any[], maxTokens = 4000, model = 'gpt-4o-mini') {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'text' },
      messages,
      max_tokens: maxTokens,
    }),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenAI ${res.status}: ${errorText}`)
  }
  const json = await res.json()
  // Extract the content from the chat completion response
  return json.choices[0]?.message?.content || ''
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

// New optimized insert using translation structure with deduplication and validation
async function insertWithTranslations(c: any, items: GenItem[]) {
  console.log(`[insertWithTranslations] Processing ${items.length} items`)

  // Group items by their group_id (explicitly set during generation)
  const baseMap = new Map<string, { base: GenItem, translations: Map<string, GenItem> }>()

  for (const it of items) {
    if (!it.options?.length || it.correct_idx < 1 || it.correct_idx > it.options.length) {
      console.warn('[insertWithTranslations] Skipping invalid item:', it.prompt?.slice(0, 50))
      continue
    }

    // Use group_id for explicit grouping (set during generation)
    const key = it.group_id || `fallback_${it.prompt.slice(0, 30)}`

    if (!baseMap.has(key)) {
      baseMap.set(key, { base: it, translations: new Map() })
    }

    const entry = baseMap.get(key)!
    // Always use English version as base if available
    if (it.lang === 'en') {
      entry.base = it
    }
    entry.translations.set(it.lang, it)
  }

  console.log(`[insertWithTranslations] Grouped into ${baseMap.size} base questions`)

  // Check for existing duplicates in database
  const existingPrompts = new Set<string>()
  try {
    const existing = await c.env.DB.prepare(
      `SELECT qt.prompt FROM question_translation qt WHERE qt.lang = 'en' LIMIT 10000`
    ).all()

    for (const row of (existing.results || [])) {
      const normalized = String(row.prompt || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
      existingPrompts.add(normalized)
    }
    console.log(`[insertWithTranslations] Found ${existingPrompts.size} existing questions for deduplication`)
  } catch (e) {
    console.warn('[insertWithTranslations] Could not check for duplicates:', e)
  }

  const stmts: D1PreparedStatement[] = []
  let skippedDuplicates = 0
  let skippedIncomplete = 0

  for (const [key, { base, translations }] of baseMap) {
    // STRICT VALIDATION: Only insert if we have ALL required languages
    const requiredLangs = ['en', 'ru', 'es']
    const hasAllTranslations = requiredLangs.every(lang => translations.has(lang))

    if (!hasAllTranslations) {
      const missing = requiredLangs.filter(lang => !translations.has(lang))
      console.warn(`[insertWithTranslations] Skipping incomplete question (missing: ${missing.join(', ')}): ${base.prompt?.slice(0, 50)}`)
      skippedIncomplete++
      continue
    }

    // Check for duplicates
    const englishTranslation = translations.get('en')!
    const normalized = englishTranslation.prompt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
    if (existingPrompts.has(normalized)) {
      console.warn(`[insertWithTranslations] Skipping duplicate: ${englishTranslation.prompt.slice(0, 50)}`)
      skippedDuplicates++
      continue
    }

    const baseId = crypto.randomUUID()
    const ans = base.options[base.correct_idx - 1]

    let verified = 0
    let sourceTitles: string[] = []
    if (base.sources?.length) {
      try {
        const v = await lightVerify(base.sources[0].url, ans)
        verified = v.ok ? 1 : 0
        sourceTitles = base.sources.map(s => s.title || (s.url === base.sources[0].url ? v.title : ''))
      } catch (e) {
        console.warn('[insertWithTranslations] Source verification failed:', e)
      }
    }

    // Insert base question
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO question_base
         (id, category, difficulty, region, source_urls, source_titles, verified)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        baseId,
        base.category,
        Math.max(1, Math.min(6, Math.floor(base.difficulty))),
        base.region || 'global',
        JSON.stringify(base.sources?.map(s => s.url) || []),
        JSON.stringify(sourceTitles),
        verified
      )
    )

    // Insert all translations (including the base language)
    for (const [lang, translation] of translations) {
      stmts.push(
        c.env.DB.prepare(
          `INSERT INTO question_translation
           (base_id, lang, prompt, options, correct_idx)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          baseId,
          lang,
          translation.prompt.trim(),
          JSON.stringify(translation.options),
          translation.correct_idx - 1  // Convert from 1-based (OpenAI) to 0-based (database)
        )
      )
    }
  }

  console.log(`[insertWithTranslations] Inserting ${stmts.length} statements (${stmts.length / 4} base questions)`)
  console.log(`[insertWithTranslations] Skipped: ${skippedDuplicates} duplicates, ${skippedIncomplete} incomplete`)

  if (stmts.length) await c.env.DB.batch(stmts)
  return Math.floor(stmts.length / 4) // Each base has 1 base + 3 translations = 4 statements
}

async function generateAndIngest(c: any, opts: { langs: string[], regions: string[], count: number }) {
  const sys = `You are a rigorous multilingual trivia question generator.
Return ONLY valid JSON Lines (one JSON object per line, no trailing commas).
Family-friendly content. Verifiable facts. NO time-sensitive or contentious topics.

CRITICAL FORMAT REQUIREMENTS:
- EXACTLY 4 answer options per question (no more, no less)
- correct_idx must be 1, 2, 3, or 4 (1-based index)
- Each option must be concise (max 100 characters)
- Include 1-3 reputable sources with working URLs
- One question per line (JSONL format)`

  const usr = `Generate ${opts.count} trivia questions following these specifications:

DISTRIBUTION:
- languages: ${JSON.stringify(opts.langs)} (distribute evenly across languages)
- target regions: ${JSON.stringify(opts.regions)}
- categories: ["general","science","history","geography","tech","movies","music","sports","literature","nature","popculture","logic","math"]
- difficulty levels (1-6): {"1":15%,"2":25%,"3":25%,"4":20%,"5":10%,"6":5%}

OUTPUT FORMAT (JSONL):
{"lang":"en","region":"global","category":"science","difficulty":3,"prompt":"What is the chemical symbol for gold?","options":["Au","Ag","Fe","Cu"],"correct_idx":1,"sources":[{"url":"https://example.com/gold","title":"Gold Properties"}]}

VALIDATION CHECKLIST for each question:
✓ Exactly 4 options
✓ correct_idx between 1-4
✓ Category from allowed list
✓ Difficulty between 1-6
✓ At least 1 source with valid URL
✓ Question text is clear and unambiguous
✓ Only ONE correct answer

Generate exactly ${opts.count} lines of valid JSONL.`

  const text = await callOpenAI(c.env.OPENAI_API_KEY, [
    { role: 'system', content: sys },
    { role: 'user', content: usr },
  ], 16000)

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const parsed: GenItem[] = []
  for (const line of lines) {
    try {
      const item = JSON.parse(line)
      // Strict validation
      if (item.options?.length === 4 &&
          item.correct_idx >= 1 && item.correct_idx <= 4 &&
          item.prompt && item.category && item.lang) {
        parsed.push(item)
      } else {
        console.warn('[Generator] Invalid item skipped:', line.slice(0, 100))
      }
    } catch {
      console.warn('[Generator] Parse failed:', line.slice(0, 100))
    }
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

// NEW: Get recent questions for deduplication context
async function getSampleRecentQuestions(db: D1Database, category: string | null, limit: number = 50): Promise<string[]> {
  try {
    let query = 'SELECT qt.prompt FROM question_translation qt WHERE qt.lang = \'en\''
    if (category) {
      query += ` AND EXISTS (SELECT 1 FROM question_base qb WHERE qb.id = qt.base_id AND qb.category = '${category}')`
    }
    query += ` ORDER BY qt.created_at DESC LIMIT ${limit}`

    const result = await db.prepare(query).all()
    return (result.results || []).map((r: any) => String(r.prompt || ''))
  } catch (e) {
    console.warn('[getSampleRecentQuestions] Failed to fetch:', e)
    return []
  }
}

// NEW: Get category distribution to identify gaps
async function getCategoryDistribution(db: D1Database): Promise<Map<string, number>> {
  const dist = new Map<string, number>()
  try {
    const result = await db.prepare(
      `SELECT qb.category, COUNT(*) as count
       FROM question_base qb
       GROUP BY qb.category`
    ).all()

    for (const row of (result.results || [])) {
      dist.set(String(row.category), Number(row.count))
    }
  } catch (e) {
    console.warn('[getCategoryDistribution] Failed:', e)
  }
  return dist
}

// NEW: Step 1 - Generate English questions with smart targeting
async function generateEnglishQuestions(
  apiKey: string,
  count: number,
  regions: string[],
  db: D1Database
): Promise<GenItem[]> {
  console.log(`[generateEnglishQuestions] Generating ${count} English questions`)

  // Get category distribution to target underrepresented areas
  const distribution = await getCategoryDistribution(db)
  console.log(`[generateEnglishQuestions] Current distribution:`, Object.fromEntries(distribution))

  const allCategories = ["general","science","history","geography","tech","movies","music","sports","literature","nature","popculture","logic","math"]

  // Find underrepresented categories (have fewer questions)
  const avgCount = Array.from(distribution.values()).reduce((a, b) => a + b, 0) / Math.max(distribution.size, 1)
  const targetCategories = allCategories.filter(cat => (distribution.get(cat) || 0) < avgCount)
  const focusCategories = targetCategories.length > 0 ? targetCategories : allCategories

  console.log(`[generateEnglishQuestions] Focusing on categories:`, focusCategories)

  // Get sample recent questions to avoid duplicates
  const recentQuestions = await getSampleRecentQuestions(db, null, 30)
  const avoidExamples = recentQuestions.length > 0
    ? `\n\nAVOID generating questions similar to these recent ones:\n${recentQuestions.slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const sys = `You are a rigorous trivia question generator. Generate ONLY English questions.
Return ONLY valid JSON Lines (one JSON object per line).
Family-friendly content. Verifiable facts. NO time-sensitive or contentious topics.
Focus on UNIQUE questions that are different from existing ones.

CRITICAL FORMAT REQUIREMENTS:
- EXACTLY 4 answer options per question
- correct_idx must be 1, 2, 3, or 4 (1-based index)
- Each option must be concise (max 100 characters)
- Include 1-3 reputable Wikipedia or educational sources
- One question per line (JSONL format)`

  const usr = `Generate ${count} UNIQUE trivia questions in English.

DISTRIBUTION:
- regions: ${JSON.stringify(regions)}
- FOCUS on these underrepresented categories: ${JSON.stringify(focusCategories)}
- difficulty levels (1-6): {"1":15%,"2":25%,"3":25%,"4":20%,"5":10%,"6":5%}
${avoidExamples}

OUTPUT FORMAT (one per line):
{"lang":"en","region":"global","category":"science","difficulty":3,"prompt":"What is the chemical symbol for gold?","options":["Au","Ag","Fe","Cu"],"correct_idx":1,"sources":[{"url":"https://en.wikipedia.org/wiki/Gold","title":"Gold"}]}

Generate exactly ${count} lines of valid JSONL with diverse, unique questions.`

  const text = await callOpenAI(apiKey, [
    { role: 'system', content: sys },
    { role: 'user', content: usr },
  ], 8000, 'gpt-4o-mini')

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const parsed: GenItem[] = []

  for (const line of lines) {
    try {
      const item = JSON.parse(line)
      if (item.options?.length === 4 &&
          item.correct_idx >= 1 && item.correct_idx <= 4 &&
          item.prompt && item.category && item.lang === 'en') {
        parsed.push(item)
      } else {
        console.warn('[generateEnglishQuestions] Invalid item:', line.slice(0, 100))
      }
    } catch {
      console.warn('[generateEnglishQuestions] Parse failed:', line.slice(0, 100))
    }
  }

  console.log(`[generateEnglishQuestions] Parsed ${parsed.length} valid English questions`)
  return parsed
}

// NEW: Step 2 - Translate questions to other languages
async function translateQuestions(apiKey: string, englishQuestions: GenItem[], targetLangs: string[]): Promise<Map<string, GenItem[]>> {
  console.log(`[translateQuestions] Translating ${englishQuestions.length} questions to ${targetLangs.join(', ')}`)

  const translations = new Map<string, GenItem[]>()

  // Process in batches of 10 questions per API call
  const batchSize = 10
  for (let i = 0; i < englishQuestions.length; i += batchSize) {
    const batch = englishQuestions.slice(i, i + batchSize)

    for (const targetLang of targetLangs) {
      if (targetLang === 'en') continue // Skip English

      const langName = targetLang === 'ru' ? 'Russian' : targetLang === 'es' ? 'Spanish' : targetLang

      const sys = `You are a professional translator. Translate trivia questions to ${langName}.
CRITICAL: Keep the same structure, translate prompt and options. Maintain factual accuracy.
Return ONLY valid JSON Lines (one per line).`

      const questionList = batch.map((q, idx) =>
        `${idx + 1}. ${JSON.stringify({ prompt: q.prompt, options: q.options, correct_idx: q.correct_idx })}`
      ).join('\n')

      const usr = `Translate these ${batch.length} trivia questions to ${langName}.

For each question, output ONE line of JSON with this format:
{"question_idx":1,"prompt":"translated prompt","options":["opt1","opt2","opt3","opt4"]}

Questions to translate:
${questionList}

Output ${batch.length} lines of JSON, one per question in order.`

      try {
        const text = await callOpenAI(apiKey, [
          { role: 'system', content: sys },
          { role: 'user', content: usr },
        ], 4000, 'gpt-3.5-turbo') // Use cheaper model for translations

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

        for (const line of lines) {
          try {
            const translated = JSON.parse(line)
            const originalIdx = (translated.question_idx || 0) - 1

            if (originalIdx >= 0 && originalIdx < batch.length) {
              const original = batch[originalIdx]
              const translatedQuestion: GenItem = {
                lang: targetLang,
                region: original.region,
                category: original.category,
                difficulty: original.difficulty,
                prompt: translated.prompt,
                options: translated.options,
                correct_idx: original.correct_idx, // Keep same answer position
                sources: original.sources
              }

              if (!translations.has(targetLang)) {
                translations.set(targetLang, [])
              }
              translations.get(targetLang)!.push(translatedQuestion)
            }
          } catch {
            console.warn(`[translateQuestions] Failed to parse translation: ${line.slice(0, 100)}`)
          }
        }
      } catch (e: any) {
        console.error(`[translateQuestions] Failed to translate batch to ${targetLang}:`, e.message)
      }
    }
  }

  for (const [lang, items] of translations) {
    console.log(`[translateQuestions] Got ${items.length} ${lang} translations`)
  }

  return translations
}

// NEW: Step 3 - Combine and validate all translations
async function generateWithTranslations(c: any, opts: { langs: string[], regions: string[], count: number }) {
  console.log('[generateWithTranslations] Starting with opts:', JSON.stringify(opts))

  // Step 1: Generate English questions with smart targeting
  const englishQuestions = await generateEnglishQuestions(c.env.OPENAI_API_KEY, opts.count, opts.regions, c.env.DB)

  if (englishQuestions.length === 0) {
    console.error('[generateWithTranslations] No English questions generated')
    return { requested: opts.count, parsed: 0, inserted: 0 }
  }

  console.log(`[generateWithTranslations] Generated ${englishQuestions.length} English questions`)

  // Assign unique group IDs to English questions
  for (let i = 0; i < englishQuestions.length; i++) {
    englishQuestions[i].group_id = `grp_${Date.now()}_${i}`
  }

  // Step 2: Translate to other languages
  const otherLangs = opts.langs.filter(l => l !== 'en')
  const translations = await translateQuestions(c.env.OPENAI_API_KEY, englishQuestions, otherLangs)

  // Step 3: Combine into complete question sets with explicit linking
  const completeQuestions: GenItem[] = []
  let completeCount = 0
  let incompleteCount = 0

  for (let i = 0; i < englishQuestions.length; i++) {
    const english = englishQuestions[i]
    const groupTranslations: GenItem[] = [english]

    // Collect all translations for this question
    let hasAllTranslations = true
    for (const targetLang of otherLangs) {
      const langTranslations = translations.get(targetLang) || []
      if (i < langTranslations.length) {
        const translation = langTranslations[i]
        translation.group_id = english.group_id // Link to same group
        groupTranslations.push(translation)
      } else {
        console.warn(`[generateWithTranslations] Missing ${targetLang} translation for question ${i}: "${english.prompt.slice(0, 50)}..."`)
        hasAllTranslations = false
      }
    }

    // Only add to completeQuestions if we have ALL translations
    if (hasAllTranslations && groupTranslations.length === opts.langs.length) {
      completeQuestions.push(...groupTranslations)
      completeCount++
    } else {
      incompleteCount++
      console.warn(`[generateWithTranslations] Skipping question ${i} - incomplete translations (have ${groupTranslations.length}/${opts.langs.length})`)
    }
  }

  console.log(`[generateWithTranslations] Complete questions: ${completeCount}, Incomplete: ${incompleteCount}`)
  console.log(`[generateWithTranslations] Total items to insert: ${completeQuestions.length} (should be ${completeCount} × ${opts.langs.length} = ${completeCount * opts.langs.length})`)

  if (completeQuestions.length === 0) {
    console.error('[generateWithTranslations] No complete question sets to insert!')
    return { requested: opts.count, parsed: 0, inserted: 0 }
  }

  // Step 4: Insert into database with validation
  const inserted = await insertWithTranslations(c, completeQuestions)
  console.log(`[generateWithTranslations] Successfully inserted ${inserted} base questions`)

  return { requested: opts.count, parsed: completeQuestions.length, inserted, complete: completeCount, incomplete: incompleteCount }
}

/** ---------- Admin endpoint ---------- */

app.post('/admin/generate', async (c) => {
  const auth = c.req.header('authorization') || ''
  if (auth !== `Bearer ${c.env.ADMIN_KEY}`) return c.json({ error: 'unauthorized' }, 401)

  const { langs = ['en', 'ru', 'es'], regions = ['global'], count = 100 } = (await c.req.json().catch(() => ({}))) as any
  try {
    const out = await generateWithTranslations(c, { langs, regions, count: Math.min(500, Number(count) || 100) })
    return c.json({ ok: true, ...out })
  } catch (e: any) {
    return c.json({ ok: false, error: e.message })
  }
})

// Test endpoint to trigger cron logic manually (requires admin key)
app.post('/admin/trigger-cron', async (c) => {
  const auth = c.req.header('authorization') || ''
  if (auth !== `Bearer ${c.env.ADMIN_KEY}`) return c.json({ error: 'unauthorized' }, 401)

  try {
    // Run the same logic as the scheduled cron
    const langs = ['en', 'ru', 'es']
    const regions = ['global']
    const nightlyTarget = 100
    const maxTotalBase = 100_000

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM question_base'
    ).first<{ count: number }>()

    const currentCount = countResult?.count ?? 0

    if (currentCount >= maxTotalBase) {
      return c.json({
        ok: true,
        message: `Already have ${currentCount} base questions (target: ${maxTotalBase})`,
        skipped: true
      })
    }

    const remaining = maxTotalBase - currentCount
    const toGenerate = Math.min(nightlyTarget, remaining)

    console.log(`[MANUAL TRIGGER] Generating ${toGenerate} base questions with ${langs.length} translations (current: ${currentCount}/${maxTotalBase})`)

    const { inserted } = await generateWithTranslations({ env: c.env }, { langs, regions, count: toGenerate })

    return c.json({
      ok: true,
      message: `Successfully inserted ${inserted} base questions with translations`,
      inserted,
      currentCount: currentCount + inserted,
      remaining: maxTotalBase - (currentCount + inserted)
    })
  } catch (e: any) {
    console.error('[MANUAL TRIGGER] Failed:', e.message, e.stack)
    return c.json({ ok: false, error: e.message, stack: e.stack }, 500)
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
    // Nightly generation: add base questions with translations
    // Goal: reach maxTotalBase questions with translations in en, ru, es
    const langs = ['en', 'ru', 'es']      // Generate questions in English, Russian, Spanish
    const regions = ['global']            // add 'RU','US','IN','MX','BR','EU' later

    // Configurable via environment variables
    const nightlyTarget = Number(env.NIGHTLY_TARGET || 100)      // questions per cron run
    const maxTotalBase = Number(env.MAX_TOTAL_QUESTIONS || 100_000)  // total questions limit

    try {
      // Check current count of base questions (language-agnostic)
      const countResult = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM question_base'
      ).first<{ count: number }>()

      const currentCount = countResult?.count ?? 0

      // Skip if we've already reached the target
      if (currentCount >= maxTotalBase) {
        console.log(`[CRON] Already have ${currentCount} base questions (target: ${maxTotalBase}). Skipping.`)
        return
      }

      const remaining = maxTotalBase - currentCount
      const toGenerate = Math.min(nightlyTarget, remaining)

      console.log(`[CRON] Generating ${toGenerate} base questions with ${langs.length} translations (current: ${currentCount}/${maxTotalBase})`)

      // Generate questions in all languages at once (OpenAI will create translations)
      const { inserted } = await generateWithTranslations({ env }, { langs, regions, count: toGenerate })
      console.log(`[CRON] Successfully inserted ${inserted} base questions with translations`)
    } catch (e: any) {
      console.error('[CRON] Failed:', e.message, e.stack)
    }
  }
}
