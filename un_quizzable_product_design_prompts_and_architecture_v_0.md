# UnQuizzable – Product Design, Prompts, and Architecture (v0.1)

_Last updated: 2025‑11‑01_

## 1) Vision & Goals
- **Vision:** A delightful, adaptive, multi‑lingual trivia game that helps everyone (kids → adults) feel smarter in minutes a day.
- **North Stars:** D1/7 retention, average session 5–7 minutes, ≥60–80% correctness (flow), 90th percentile daily streak ≥7 days.
- **Principles:** Instant start · Low friction · Adaptive difficulty · Fresh content · Fair monetization · Privacy‑first.

## 2) Target Personas
- **Casual Learner (13–60):** Light daily play, wants fun + variety.
- **Competitor (16–40):** Streaks, ladders, Endless mode, leaderboards.
- **Parent/Kid (7–12 with guardian):** Safe content, simplified UI, reading assistance.

## 3) Game Modes & Core Loop
- **Run Mode (default):** 10 questions · 2 lives · clear finish line.
- **Endless Mode (unlocks after 2 finished runs):** 3 lives, rising difficulty until fail.
- **Daily Challenge:** 3 curated questions; 60‑sec total; streak booster.
- **Core Loop:** Home → Play → (Adaptive Qs) → Results → Optional rewarded ad → Progression (streak, badges, tiers).

## 4) Difficulty, Scoring, and Adaptation
### 4.1 User Skill & Item Difficulty
- **User skill μ:** real‑valued (start = 3.0 on 1–6 scale). Updated each answer:
  - correct: μ += 0.30 (fast) / 0.20 (normal) / 0.10 (slow)
  - wrong:   μ -= 0.20 (normal) / 0.30 (fast guess) / 0.10 (slow)
  - clamp to [1.0, 6.0]; also track σ for confidence (optional phase 2).
- **Question difficulty d:** 1..6 estimated by template → refined by live accuracy.
- **Selection:** target d ≈ round(μ), 70% within μ ± 0.5, 30% exploration.

### 4.2 Scoring
- **Base:** 100 × d
- **Speed bonus:** up to +30% with exponential decay vs answer time (cap 15s).
- **Streak multiplier:** +10% per consecutive correct (cap +50%).
- **Run summary:** score, max streak, accuracy, time.

### 4.3 Lives & Recovery
- **Run:** 2 lives; **Endless:** 3 lives. One optional revive (rewarded ad or Plus benefit).
- **Flow guard:** after 2 consecutive wrong, inject one easier question (d − 1) to rebuild confidence.

## 5) Content Strategy (AI‑assisted)
- **Sources:** OpenAI generation (structured JSON), human‑curated seeds, community submissions (later).
- **Pipelines:** generation → validation → dedupe → moderation → localization → publish.
- **Freshness:** maintain inventory thresholds per (lang, category, difficulty). Auto‑generate when stock < target.
- **Localization:** locale‑aware phrasing; cultural sensitivity filters; avoid region‑specific bias for global pools.

## 6) Safety, Age, and Accessibility
- **Age gates:** 7–12 (kid UX), 13+ (standard). Age stored with parental consent note when applicable.
- **Sensitive topics filter:** violence, adult themes, politics by age region rules. Tiered strictness for kids.
- **Accessibility:** large fonts toggle, dyslexia‑friendly font, color‑blind safe palette, TTS option.

## 7) Monetization (Fair by Design)
- **Ads:** None during Q&A. Rewarded only at end‑of‑run (bonus) and single mid‑run revive.
- **Subscription (UnQuizzable Plus):** $2.99–$4.99/mo (region‑priced). Benefits: ad‑free, 1 extra daily revive, advanced stats, focus theme, cosmetic badges, monthly pro pack.
- **Soft currency (phase 2):** earnable coins for hints/revives; ad‑earn optional.
- **Compliance:** clearly disclose ad logic; parental gate for under‑13.

## 8) UX Flows (Happy Paths)
### 8.1 First‑Time User (Standard)
1. Splash → Quick profile (nickname, age group, preferred topics) → Tutorial (1 sample Q) → Home.
2. Home: “Play Run” → 10 Q with adaptive selection → Results → Optional rewarded ad → Streak & badges.

### 8.2 Kid Mode (Under 13)
- Simplified language, bigger buttons, no social features, stricter content set. Guardian consent screen.

### 8.3 Endless Unlock
- After 2 completed runs: unlock card; tooltip explains rules and leaderboards.

### 8.4 Subscription Upsell (Soft)
- Non‑blocking banner in Results with value props; free 3‑day trial; manage subscription link.

## 9) Data & Privacy
- **Collected:** nickname, age group, (optional) gender, locale, category preferences, device locale/timezone; gameplay events.
- **Not collected:** precise geolocation, sensitive attributes by default.
- **Consent:** granular toggles; COPPA/GDPR/CCPA compliant language; data deletion request path.
- **Anonymization:** user IDs are UUIDv4; analytics aggregated.

## 10) High‑Level Architecture
- **Client:** Mobile (Flutter/React Native/Native) or Web. Calls HTTPS API.
- **API:** Cloudflare Worker (Hono). Routes: auth, next, answer, results, leaderboard, profile.
- **DB (Phase 1):** Cloudflare D1 (SQLite). Tables: user, question, user_answer, user_skill, run_session, streak_state, topic_pref.
- **Cache:** Cloudflare KV for seen‑sets, daily leaderboards cache, feature flags.
- **Object Store:** R2/S3 for raw JSON question dumps and backups.
- **Background Jobs:** CF Queues or cron Workers for generation/ingest and nightly rollups.
- **Future DB:** Postgres (Neon/Cloud SQL) via Hyperdrive; Redis (Upstash) for sorted‑set leaderboards.

**Scaling path:**
1) D1 + KV free tier → 2) Neon Postgres + Hyperdrive, Upstash Redis → 3) microservices for content pipeline, analytics in ClickHouse/BigQuery; regional shards if needed.

## 11) Data Model (v0.2)
```sql
-- new/updated tables (additive to existing ones)
CREATE TABLE IF NOT EXISTS user_skill (
  user_id TEXT PRIMARY KEY,
  mu REAL NOT NULL DEFAULT 3.0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS run_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('run','endless','daily')),
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  score INTEGER DEFAULT 0,
  lives_used INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS streak_state (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topic_pref (
  user_id TEXT,
  topic TEXT,
  weight REAL DEFAULT 0.0,
  PRIMARY KEY (user_id, topic)
);

ALTER TABLE question ADD COLUMN IF NOT EXISTS lang TEXT;
ALTER TABLE question ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE question ADD COLUMN IF NOT EXISTS difficulty TEXT;
```

## 12) API Surface (v1)
- `POST /register` → { userId, token }
- `GET /quiz/next?lang&cat&diff&n` (header `x-user`) → { items: [ {id,prompt,options} ] }
- `POST /quiz/answer` { questionId, correct, timeMs } → { ok, newMu, streak }
- `POST /session/start` { mode } → { sessionId }
- `POST /session/finish` { sessionId } → { score, stats }
- `GET /leaderboard/daily` → { top[], me{} }
- `GET /profile` / `POST /profile` (age group, topics, locale)
- `POST /admin/questions/import` (protected)

## 13) Server Logic (Pseudo)
### 13.1 Next‑question selection
1. Resolve user μ and preferences.
2. Pull candidates by lang/category around target difficulty (μ ± 0.5), over‑fetch ×5.
3. Filter seen via KV; fallback to DB check.
4. Shuffle; pick N.

### 13.2 Answer handling
- Persist `user_answer`.
- Update μ using rules in §4.1 based on correctness + speed bucket.
- Update streak_state; write session aggregates.
- Update topic_pref weights (up on correct/fast; slight down on wrong/slow).

## 14) Rork.com Prompt Library (AI Pipelines)
> _Goal: structured, safe, multilingual question generation & maintenance._

### 14.1 Generation – Base Trivia Q (JSON)
**System:**
“Generate multiple‑choice trivia questions. Output **ONLY** valid JSON matching the schema. Keep facts current and widely agreed. Avoid sensitive/age‑inappropriate content. Language: {{lang}}. Difficulty: {{difficulty}} (1=easiest…6=hardest). Category: {{category}}. Provide one correct option and 3 distractors.”

**User:**
“Produce {{count}} items.”

**JSON Schema (for tool/function calling):**
```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "lang": {"type":"string"},
          "category": {"type":"string"},
          "difficulty": {"type":"integer","minimum":1,"maximum":6},
          "prompt": {"type":"string"},
          "options": {"type":"array","minItems":4,"maxItems":6,"items":{"type":"string"}},
          "correct_idx": {"type":"integer","minimum":1}
        },
        "required": ["lang","category","difficulty","prompt","options","correct_idx"]
      }
    }
  },
  "required": ["items"]
}
```

### 14.2 Validator – Fact Check & Age Filter
**System:** “Verify each item is factual, neutral, age‑appropriate for target age {{age_group}}, culturally sensitive in region {{region}}. Reject or rewrite questionable items. Output only valid JSON same schema. If uncertain, drop the item.”

### 14.3 Dedupe & Normalize
**System:** “Normalize text (lowercase non‑proper nouns, strip punctuation, trim spaces). Compute `normalized_hash` = SHA256 of `prompt + \n + sorted(options)` (pseudo‑step comment). Remove duplicates within batch.”

### 14.4 Rewrite for Reading Level (Kids)
**System:** “Rewrite prompts/options to CEFR A2 reading level. Keep correctness. Avoid idioms. Output JSON.”

### 14.5 Localization
**System:** “Translate to {{target_lang}} with locale‑accurate terms. Avoid culture‑specific sports/TV unless globally known. Keep JSON fields and indices intact.”

### 14.6 Difficulty Rater
**System:** “Estimate difficulty 1–6 from topic rarity and distractor strength. Calibrate around: 1=common facts; 3=high‑school level; 6=expert facts.”

### 14.7 Quality Sampler (Human‑in‑loop)
**System:** “From a batch, select top 10% most engaging questions by curiosity (novel yet fair). Flag 10% to remove for ambiguity.”

## 15) Analytics & Experiments
- **Metrics:** D1/7/30 retention, ARPDAU, avg session length, finish rate, correct%, revive usage, ad opt‑in rate, Plus conversion, churn reason (last session markers).
- **A/B tests:** run length (8/10/12), revive count (1/2), speed bonus curve, subscription price points, endless unlock condition, daily challenge timer.

## 16) Roadmap
- **MVP (Month 1):** Run Mode, adaptive μ, basic scoring, D1+KV, English, daily challenge, rewarded ad placeholders, Plus placeholder.
- **Month 2:** Endless, leaderboards cache, topic preferences, localization (RO/RU/ES), content pipeline cron, kid mode.
- **Month 3+:** Neon Postgres, Upstash Redis leaderboards, analytics warehouse, season tiers, collections, human review tools.

## 17) Risks & Mitigations
- **Content inaccuracies:** validator + human spot checks; allow in‑app “report question”.
- **User frustration:** flow guard + dynamic difficulty.
- **Privacy:** strict consent; minimize collection; deletion self‑service.
- **Scale:** migration path to Postgres/Redis; stateless Workers.

## 18) Open Questions
- Should kid mode allow voice hints?
- Region‑specific sports/TV pools per locale vs global pool?
- What revive/ad frequencies maintain best LTV without harming retention?

---

# Appendix A – Endpoint Contracts (concise)
- **/register** → `{ userId, token }`
- **/quiz/next** (hdr: x-user) → `{ items:[{ id, prompt, options[] }] }`
- **/quiz/answer** → `{ ok:true, newMu, streak:{current,best} }`
- **/session/start** → `{ sessionId }`
- **/session/finish** → `{ score, maxStreak, accuracy }`

# Appendix B – Client Hints
- Keep per‑question timer UI but no hard timeouts for Run mode (only speed bonus).
- One tap to play; no deep menus.

# Appendix C – Consent Copy (draft)
- “We use your age group, language, and gameplay stats to personalize questions. We don’t sell personal data. You can request deletion anytime.”

