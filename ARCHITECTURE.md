# unQuizzable Backend Architecture

> **Version:** 1.0
> **Last Updated:** 2025-01-15
> **Tech Stack:** Cloudflare Workers, Hono v4, D1 (SQLite), KV Store, OpenAI API

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Feature Modules](#feature-modules)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Core Algorithms](#core-algorithms)
8. [Question Generation System](#question-generation-system)
9. [Code Structure](#code-structure)
10. [Configuration](#configuration)

---

## 🎯 System Overview

**unQuizzable** is an adaptive trivia quiz application backend that provides:

- **Adaptive Difficulty:** Questions adjust based on user skill level (μ)
- **Multi-language Support:** English, Russian, Spanish with automatic translation
- **Skill Tracking:** Dynamic skill rating system (1.0 - 6.0)
- **Question Generation:** Automated question generation using OpenAI GPT-4o-mini
- **Authentication:** Password-based auth with guest mode support
- **Scoring System:** Speed and streak bonuses
- **Streak Tracking:** Current and best streaks per user

### Key Features

```
┌─────────────────────────────────────────────────────────────┐
│                    unQuizzable Backend                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📝 User Management      🔐 Authentication                   │
│  • Guest & registered    • Password auth (scrypt)           │
│  • Profile management    • Session tokens (KV)              │
│  • Skill tracking        • Password reset                   │
│                                                              │
│  🎯 Adaptive Quizzing    📊 Analytics                        │
│  • Skill-based (μ)       • Streak tracking                  │
│  • Performance-based     • Topic preferences                │
│  • Multi-language        • Score history                    │
│                                                              │
│  🤖 AI Generation        💾 Data Management                  │
│  • OpenAI GPT-4o-mini    • D1 (SQLite) database             │
│  • Auto-translation      • KV for sessions/cache            │
│  • Nightly cron          • Batch operations                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Diagram

### High-Level Architecture

```
┌──────────────┐
│   Frontend   │
│  (Next.js)   │
└──────┬───────┘
       │ HTTPS/JSON
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge Runtime)              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Hono Framework                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Middleware  │  │    Routes    │  │   Services   │ │ │
│  │  │  • CORS      │  │  • Users     │  │  • Business  │ │ │
│  │  │  • Error     │  │  • Auth      │  │    Logic     │ │ │
│  │  │  • Logging   │  │  • Questions │  │  • Repos     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ D1 Database │  │   KV Store   │  │  OpenAI API      │   │
│  │ (SQLite)    │  │  • Sessions  │  │  • Generation    │   │
│  │ • Questions │  │  • Seen Qs   │  │  • Translation   │   │
│  │ • Users     │  │  • Resets    │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
       │
       │ Scheduled (Daily 01:00 UTC)
       ▼
┌──────────────────┐
│   Cron Worker    │
│ • Generate 100   │
│   questions      │
│ • Translate      │
│ • Verify sources │
└──────────────────┘
```

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         ROUTES LAYER                         │
│  (HTTP handlers, request/response mapping)                   │
│                                                              │
│  users/routes.ts  auth/routes.ts  questions/routes.ts       │
│  sessions/routes.ts  generation/routes.ts                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                         │
│  (Business logic, orchestration, validation)                 │
│                                                              │
│  UserService  AuthService  QuestionService                  │
│  SessionService  SkillService  ScoringService               │
│  GenerationService  StreakService  AnswerService            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      REPOSITORY LAYER                        │
│  (Data access abstraction, database operations)              │
│                                                              │
│  UserRepo  AuthRepo  QuestionRepo  SessionRepo              │
│  SkillRepo  StreakRepo  AnswerRepo                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                      │
│  (Database, cache, external APIs)                           │
│                                                              │
│  DatabaseClient  KVCache  OpenAIClient                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Feature Modules

### 1. **Users** (`features/users/`)

**Purpose:** Guest and registered user management

```
users/
├── repository.ts    # Data access (DB queries)
├── service.ts       # Business logic (user creation, collision handling)
├── routes.ts        # HTTP handlers (POST /register)
└── types.ts         # TypeScript interfaces
```

**Key Functions:**
- Create guest users with auto-generated usernames
- Handle username collision with retry logic (max 5 attempts)
- Initialize user skill (μ = 3.0) and streak state
- Username normalization for case-insensitive uniqueness

---

### 2. **Authentication** (`features/auth/`)

**Purpose:** Password-based authentication and session management

```
auth/
├── repository.ts    # User lookup, password storage
├── service.ts       # Login, logout, password reset logic
├── routes.ts        # Auth endpoints (/auth/*)
└── types.ts         # Request/response types
```

**Security Features:**
- **scrypt** password hashing (N=2^15, r=8, p=1)
- **Constant-time comparison** for password verification
- **Session tokens** stored in KV (30-day TTL)
- **Password reset tokens** in KV (15-minute TTL)
- **Username normalization** prevents case-sensitive duplicates

**Endpoints:**
- `POST /auth/register` - Create account with password
- `POST /auth/login` - Login and get session token
- `POST /auth/logout` - Invalidate session
- `POST /auth/request-password-reset` - Request reset token
- `POST /auth/reset-password` - Reset password with token
- `GET /me` - Get current user profile

---

### 3. **Questions** (`features/questions/`)

**Purpose:** Adaptive question selection and delivery

```
questions/
├── repository.ts          # Question queries with filters
├── service.ts             # Question selection logic
├── routes.ts              # GET /quiz/next
├── selection-strategy.ts  # Difficulty range calculation
└── types.ts               # Question interfaces
```

**Adaptive Selection Algorithm:**

```
┌──────────────────────────────────────────────────────────┐
│             Adaptive Question Selection                   │
└──────────────────────────────────────────────────────────┘

1. Get User Skill (μ)
   ├─ From user_skill table
   └─ Default: 3.0

2. Calculate Target Difficulty
   └─ targetDiff = round(μ), clamped [1, 6]

3. Determine Range Based on Recent Performance
   ├─ recentPerf < 0.4 (struggling)
   │  └─ Range: [max(1, μ-2), μ] (easier questions)
   │
   ├─ recentPerf > 0.7 (excelling)
   │  └─ Range: [μ, min(6, μ+2)] (harder questions)
   │
   └─ Otherwise (balanced)
      └─ Range: [max(1, μ-1), min(6, μ+1)]

4. Fetch Questions (5x multiplier)
   ├─ Try requested language first
   └─ Fallback to English if none found

5. Widen Range if Insufficient (up to 3 expansions)
   └─ Each expansion: ±1 to min/max

6. Prioritize Unseen Questions
   ├─ Check KV: seen:userId
   ├─ Sort by difficulty (progressive curve)
   ├─ Fill with unseen first
   └─ Then fill with seen if needed

7. Return Questions
   └─ Progressive difficulty (easy → hard)
```

---

### 4. **Sessions** (`features/sessions/`)

**Purpose:** Quiz session lifecycle management

```
sessions/
├── repository.ts    # Session CRUD operations
├── service.ts       # Session orchestration
├── routes.ts        # Session endpoints
└── types.ts         # Session types
```

**Session Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Session Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

START SESSION
├─ POST /session/start
├─ Input: mode (run | endless | daily)
├─ Creates: run_session record
└─ Returns: sessionId

                ↓

USER ANSWERS QUESTIONS
└─ (Client-side validation)

                ↓

FINISH SESSION
├─ POST /session/finish
├─ Input: sessionId, questions[], finalScore, maxStreak
│
├─ Validation:
│  ├─ Session exists
│  ├─ Belongs to user
│  └─ Not already ended
│
├─ Batch Update (atomic):
│  ├─ Update user_skill (new μ)
│  ├─ Update streak_state (reset current, preserve best)
│  ├─ Insert user_answers (all questions)
│  └─ Update run_session (score, max_streak, ended_at)
│
├─ Update KV:
│  └─ Mark questions as seen (30-day TTL)
│
├─ Update Topic Preferences:
│  ├─ Accuracy > 70%: weight += 0.2
│  └─ Accuracy < 30%: weight -= 0.2
│
└─ Returns: { ok, score, maxStreak, newMu }
```

---

### 5. **Skills** (`features/skills/`)

**Purpose:** User skill tracking and difficulty adaptation

```
skills/
├── repository.ts    # Skill CRUD
├── service.ts       # Skill management
├── algorithms.ts    # μ calculation algorithms
└── types.ts         # Skill types
```

**Skill (μ) Update Algorithm:**

```
┌─────────────────────────────────────────────────────────────┐
│              Skill (μ) Update Algorithm                      │
└─────────────────────────────────────────────────────────────┘

For each answered question:

1. Determine Speed Bucket
   ├─ timeMs ≤ 5000ms   → fast
   ├─ timeMs ≤ 12000ms  → normal
   └─ timeMs > 12000ms  → slow

2. Get Delta from Table
   ┌────────────┬───────┬─────────┬───────┐
   │   Result   │ Fast  │ Normal  │ Slow  │
   ├────────────┼───────┼─────────┼───────┤
   │  Correct   │ +0.30 │  +0.20  │ +0.10 │
   │  Wrong     │ -0.30 │  -0.20  │ -0.10 │
   └────────────┴───────┴─────────┴───────┘

3. Update Skill
   newMu = clamp(currentMu + delta, 1.0, 6.0)

4. Process All Questions in Session
   μ₁ = updateMu(μ₀, q₁)
   μ₂ = updateMu(μ₁, q₂)
   ...
   μₙ = updateMu(μₙ₋₁, qₙ)

5. Store Final μₙ
```

---

### 6. **Scoring** (`features/scoring/`)

**Purpose:** Calculate question scores with bonuses

```
scoring/
├── service.ts       # Main scoring service
├── calculator.ts    # Bonus calculations
└── types.ts         # Score types
```

**Scoring Formula:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Scoring Formula                           │
└─────────────────────────────────────────────────────────────┘

score = 0  (if wrong)

score = base × (1 + speedBonus + streakMultiplier)  (if correct)

Where:
  base = 100 × difficulty

  speedBonus = min(0.3, 0.3 × e^(-t/8))
    where t = timeMs / 1000

  streakMultiplier = min(0.5, 0.1 × currentStreak)

Example:
  difficulty = 4
  timeMs = 3000 (3 seconds)
  currentStreak = 5

  base = 100 × 4 = 400
  speedBonus = 0.3 × e^(-3/8) = 0.207
  streakMultiplier = 0.1 × 5 = 0.5

  score = 400 × (1 + 0.207 + 0.5) = 682.8 → 683
```

---

### 7. **Generation** (`features/generation/`)

**Purpose:** AI-powered question generation and translation

```
generation/
├── service.ts         # Generation orchestration
├── openai-client.ts   # OpenAI API wrapper
├── translator.ts      # Multi-language translation
├── validator.ts       # Question validation & deduplication
├── routes.ts          # Admin endpoints
└── types.ts           # Generation types
```

**Generation Pipeline:**

```
┌─────────────────────────────────────────────────────────────┐
│           Question Generation Pipeline                       │
└─────────────────────────────────────────────────────────────┘

STEP 1: Generate English Questions
├─ Analyze category distribution
├─ Target underrepresented categories
├─ Fetch recent questions for deduplication
│
├─ Prompt GPT-4o-mini with:
│  ├─ Count: 100 (configurable)
│  ├─ Categories: Focus on underrepresented
│  ├─ Difficulty: {"1":15%,"2":25%,"3":25%,"4":20%,"5":10%,"6":5%}
│  ├─ Format: JSONL (one question per line)
│  └─ Context: Avoid similar to recent questions
│
└─ Parse & validate format
   ├─ 4 options exactly
   ├─ correct_idx ∈ [1,2,3,4]
   ├─ Has prompt, category, sources
   └─ Filter invalid items

         ↓

STEP 2: Translate to Other Languages
├─ Batch size: 10 questions per API call
├─ Target languages: ru (Russian), es (Spanish)
│
├─ For each batch × each language:
│  ├─ Prompt GPT-3.5-turbo (cheaper for translation)
│  ├─ Input: English prompt + options
│  ├─ Output: Translated prompt + options
│  └─ Preserve: correct_idx, category, sources
│
└─ Link translations via group_id

         ↓

STEP 3: Validate Completeness
├─ For each English question:
│  ├─ Check has ALL translations (en, ru, es)
│  ├─ If incomplete → skip question
│  └─ If complete → add to insertion batch
│
└─ Stats: completeCount, incompleteCount

         ↓

STEP 4: Deduplicate
├─ Fetch existing English prompts (limit 10,000)
├─ Normalize prompts:
│  ├─ Lowercase
│  ├─ Remove punctuation
│  ├─ Collapse whitespace
│  └─ Compare with existing
│
└─ Skip duplicates

         ↓

STEP 5: Verify Sources (Optional)
├─ Fetch first source URL
├─ Extract <title> from HTML
├─ Check if answer appears in title
└─ Set verified flag (0 or 1)

         ↓

STEP 6: Batch Insert
├─ For each complete question set:
│  │
│  ├─ INSERT INTO question_base
│  │  (id, category, difficulty, region, source_urls, source_titles, verified)
│  │
│  └─ For each language (en, ru, es):
│     └─ INSERT INTO question_translation
│        (base_id, lang, prompt, options, correct_idx)
│
└─ Execute batch (atomic transaction)

         ↓

RESULT
└─ { requested, parsed, inserted, complete, incomplete }
```

---

### 8. **Streaks** (`features/streaks/`)

**Purpose:** Track current and best streaks

```
streaks/
├── repository.ts    # Streak CRUD
├── service.ts       # Streak management
└── types.ts         # Streak types
```

**Streak Logic:**
- `current_streak`: Reset to 0 after each session
- `best_streak`: Updated to `max(best_streak, session.maxStreak)`
- Preserved across sessions (never decreases)

---

### 9. **Answers** (`features/answers/`)

**Purpose:** Track user answer history

```
answers/
├── repository.ts    # Answer CRUD
├── service.ts       # Answer tracking
└── types.ts         # Answer types
```

**Data Stored:**
- `user_id`, `question_id`, `correct` (boolean)
- Used for analytics and topic preferences

---

## 🔄 Data Flow

### Quiz Session Data Flow

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │
     │ 1. POST /session/start {mode}
     ▼
┌────────────────┐
│ SessionService │────────► run_session table
└────┬───────────┘         (sessionId, userId, mode)
     │
     │ 2. sessionId
     ▼
┌──────────┐
│ Frontend │
└────┬─────┘
     │
     │ 3. GET /quiz/next?lang=en&cat=science&n=10&recentPerf=0.5
     ▼
┌─────────────────┐
│ QuestionService │
└────┬────────────┘
     │
     ├─► SkillService.getUserSkill(userId) → μ
     │
     ├─► Calculate difficulty range based on μ + recentPerf
     │
     ├─► QuestionRepository.findQuestions(lang, cat, minDiff, maxDiff)
     │
     ├─► KVCache.get("seen:userId") → seenSet
     │
     └─► Filter unseen, sort by difficulty, return top 10
     │
     │ 4. {items: [q1, q2, ..., q10]}
     ▼
┌──────────┐
│ Frontend │ (User answers questions)
└────┬─────┘
     │
     │ 5. POST /session/finish {sessionId, questions[], finalScore, maxStreak}
     ▼
┌────────────────┐
│ SessionService │
└────┬───────────┘
     │
     ├─► Validate session ownership
     │
     ├─► Get current μ
     │
     ├─► For each question: μ = updateMu(μ, correct, timeMs)
     │
     ├─► Batch update:
     │   ├─ user_skill (new μ)
     │   ├─ streak_state (current=0, best=max)
     │   ├─ user_answer (all questions)
     │   └─ run_session (score, max_streak, ended_at)
     │
     ├─► KVCache.set("seen:userId", [...seenQuestions])
     │
     └─► SkillService.updateTopicPreferences()
     │
     │ 6. {ok, score, maxStreak, newMu}
     ▼
┌──────────┐
│ Frontend │
└──────────┘
```

---

## 💾 Database Schema

### Tables Overview

```
question_base (Language-agnostic metadata)
├── id: TEXT PRIMARY KEY
├── category: TEXT
├── difficulty: INTEGER [1-6]
├── region: TEXT
├── source_urls: TEXT (JSON array)
├── source_titles: TEXT (JSON array)
├── verified: INTEGER [0,1]
└── created_at: TEXT

question_translation (Language-specific content)
├── base_id: TEXT (FK → question_base.id)
├── lang: TEXT [en|ru|es]
├── prompt: TEXT
├── options: TEXT (JSON array)
├── correct_idx: INTEGER [0-3] (0-based!)
├── created_at: TEXT
└── PRIMARY KEY (base_id, lang)

user
├── id: TEXT PRIMARY KEY
├── username: TEXT
├── username_norm: TEXT UNIQUE
├── locale: TEXT
├── password_hash: TEXT (nullable)
├── password_salt: TEXT (nullable)
├── password_algo: TEXT
├── password_params: TEXT (JSON)
├── password_updated_at: TEXT
├── last_login_at: TEXT
└── created_at: TEXT

user_skill
├── user_id: TEXT PRIMARY KEY
├── mu: REAL [1.0-6.0]
└── updated_at: TEXT

streak_state
├── user_id: TEXT PRIMARY KEY
├── current_streak: INTEGER
├── best_streak: INTEGER
└── updated_at: TEXT

user_answer
├── user_id: TEXT
├── question_id: TEXT
├── correct: INTEGER [0,1]
└── PRIMARY KEY (user_id, question_id)

run_session
├── id: TEXT PRIMARY KEY
├── user_id: TEXT
├── mode: TEXT [run|endless|daily]
├── score: INTEGER
├── max_streak: INTEGER
├── started_at: TEXT
└── ended_at: TEXT (nullable)

topic_pref
├── user_id: TEXT
├── topic: TEXT
├── weight: REAL [-5.0 to 5.0]
└── PRIMARY KEY (user_id, topic)
```

### Relationships Diagram

```
         user
          │
          ├──────┬──────────┬──────────┬──────────┐
          │      │          │          │          │
          ▼      ▼          ▼          ▼          ▼
    user_skill  streak   user_answer  run_session  topic_pref
                state

question_base
     │
     └──► question_translation (1:N)
           (one base → many translations)
```

---

## 🌐 API Endpoints

### Public Endpoints

#### User Management

```http
POST /register
Content-Type: application/json

{
  "username": "player123",  // optional, generates Guest_xxx if missing
  "locale": "en"            // optional, default: en
}

Response: 200 OK
{
  "userId": "uuid",
  "token": "uuid"  // For backward compatibility with guest users
}
```

#### Authentication

```http
POST /auth/register
Content-Type: application/json

{
  "username": "player123",
  "password": "password123",  // min 8 chars
  "locale": "en"
}

Response: 200 OK
{
  "userId": "uuid",
  "sessionToken": "uuid"
}
```

```http
POST /auth/login
Content-Type: application/json

{
  "username": "player123",
  "password": "password123"
}

Response: 200 OK
{
  "userId": "uuid",
  "sessionToken": "uuid"
}
```

```http
POST /auth/logout
Authorization: Bearer <sessionToken>

Response: 200 OK
{
  "ok": true
}
```

```http
GET /me
Authorization: Bearer <sessionToken>
X-User: <userId>  // Fallback for anonymous users

Response: 200 OK
{
  "id": "uuid",
  "username": "player123",
  "locale": "en",
  "last_login_at": "2025-01-15T10:30:00Z"
}
```

#### Quiz Flow

```http
GET /quiz/next?lang=en&cat=science&n=10&recentPerf=0.5
X-User: <userId>

Query Parameters:
  - lang: en|ru|es (default: en)
  - cat: science|history|geography|... (default: general)
  - n: number of questions (default: 10)
  - recentPerf: 0.0-1.0 (default: 0.5)

Response: 200 OK
{
  "items": [
    {
      "id": "uuid",
      "prompt": "What is the chemical symbol for gold?",
      "options": ["Au", "Ag", "Fe", "Cu"],
      "correct_idx": 0,
      "difficulty": 3,
      "category": "science"
    },
    ...
  ]
}
```

```http
POST /session/start
X-User: <userId>
Content-Type: application/json

{
  "mode": "run"  // run|endless|daily
}

Response: 200 OK
{
  "sessionId": "uuid"
}
```

```http
POST /session/finish
X-User: <userId>
Content-Type: application/json

{
  "sessionId": "uuid",
  "questions": [
    {
      "questionId": "uuid",
      "selectedIdx": 0,
      "timeMs": 3000,
      "difficulty": 3,
      "category": "science",
      "correct": true
    },
    ...
  ],
  "finalScore": 1250,
  "maxStreak": 8
}

Response: 200 OK
{
  "ok": true,
  "score": 1250,
  "maxStreak": 8,
  "newMu": 3.4
}
```

### Admin Endpoints

```http
POST /admin/generate
Authorization: Bearer <ADMIN_KEY>
Content-Type: application/json

{
  "langs": ["en", "ru", "es"],
  "regions": ["global"],
  "count": 100
}

Response: 200 OK
{
  "ok": true,
  "requested": 100,
  "parsed": 98,
  "inserted": 95,
  "complete": 95,
  "incomplete": 3
}
```

```http
POST /admin/trigger-cron
Authorization: Bearer <ADMIN_KEY>

Response: 200 OK
{
  "ok": true,
  "message": "Successfully inserted 95 base questions with translations",
  "inserted": 95,
  "currentCount": 1095,
  "remaining": 98905
}
```

---

## 🧮 Core Algorithms

### 1. Adaptive Difficulty Range

```typescript
function calculateDifficultyRange(userSkill: number, recentPerf: number): DifficultyRange {
  const dTarget = Math.round(userSkill)  // Target difficulty

  if (recentPerf < 0.4) {
    // Struggling: easier questions
    return { min: max(1, dTarget - 2), max: dTarget }
  } else if (recentPerf > 0.7) {
    // Excelling: harder questions
    return { min: dTarget, max: min(6, dTarget + 2) }
  } else {
    // Balanced
    return { min: max(1, dTarget - 1), max: min(6, dTarget + 1) }
  }
}
```

### 2. Skill Update (μ)

```typescript
function updateMu(mu: number, correct: boolean, timeMs?: number): number {
  const speedBucket = getSpeedBucket(timeMs)

  const deltas = {
    correct: { fast: 0.30, normal: 0.20, slow: 0.10 },
    wrong:   { fast: -0.30, normal: -0.20, slow: -0.10 }
  }

  const delta = correct ? deltas.correct[speedBucket] : deltas.wrong[speedBucket]

  return clamp(mu + delta, 1.0, 6.0)
}

function getSpeedBucket(timeMs?: number): 'fast' | 'normal' | 'slow' {
  if (!timeMs) return 'normal'
  if (timeMs <= 5000) return 'fast'
  if (timeMs <= 12000) return 'normal'
  return 'slow'
}
```

### 3. Score Calculation

```typescript
function calculateScore(correct: boolean, difficulty: number, timeMs?: number, currentStreak?: number): number {
  if (!correct) return 0

  const base = 100 * difficulty

  // Speed bonus: max 30%
  const t = (timeMs ?? 15000) / 1000
  const speedBonus = min(0.3, 0.3 * exp(-t / 8))

  // Streak multiplier: max 50%
  const streakMult = min(0.5, 0.1 * max(0, currentStreak ?? 0))

  return round(base * (1 + speedBonus + streakMult))
}
```

### 4. Topic Preference Update

```typescript
function updateTopicPreference(userId: string, category: string, accuracy: number): void {
  const currentWeight = getCurrentWeight(userId, category) ?? 0

  let delta = 0
  if (accuracy > 0.7) delta = 0.2   // Good performance → increase weight
  if (accuracy < 0.3) delta = -0.2  // Poor performance → decrease weight

  const newWeight = clamp(currentWeight + delta, -5, 5)

  saveWeight(userId, category, newWeight)
}
```

---

## 🤖 Question Generation System

### Nightly Cron Job

**Schedule:** Daily at 01:00 UTC

```typescript
// src/cron.ts
export async function runQuestionGeneration(env: Env): Promise<void> {
  const langs = ['en', 'ru', 'es']
  const regions = ['global']
  const nightlyTarget = Number(env.NIGHTLY_TARGET || 100)
  const maxTotalBase = Number(env.MAX_TOTAL_QUESTIONS || 100000)

  // Check current count
  const currentCount = await countQuestions()

  if (currentCount >= maxTotalBase) {
    console.log(`Already have ${currentCount} questions. Skipping.`)
    return
  }

  const toGenerate = min(nightlyTarget, maxTotalBase - currentCount)

  // Generate questions with translations
  const result = await generationService.generateWithTranslations({
    langs,
    regions,
    count: toGenerate
  })

  console.log(`Successfully inserted ${result.inserted} base questions`)
}
```

### Generation Strategy

1. **Category Balancing:**
   - Analyze current distribution across 13 categories
   - Focus on underrepresented categories
   - Ensure diverse question pool

2. **Deduplication:**
   - Fetch recent 10,000 English prompts
   - Normalize (lowercase, remove punctuation)
   - Skip duplicates before insertion

3. **Quality Control:**
   - Validate format (4 options, valid correct_idx)
   - Require all translations (en, ru, es)
   - Optional source verification via HTTP fetch

4. **Batch Processing:**
   - Generate in batches of 10 (API efficiency)
   - Atomic database transactions
   - Rollback on failure

---

## 📁 Code Structure

```
src/
├── index.ts                    # Main entry point, bootstrap
├── cron.ts                     # Scheduled question generation
│
├── config/
│   └── constants.ts            # All configuration constants
│
├── types/
│   └── env.ts                  # Environment bindings (D1, KV, API keys)
│
├── shared/                     # Shared infrastructure
│   ├── cache/
│   │   └── kv-client.ts        # KV Store wrapper
│   ├── database/
│   │   └── client.ts           # D1 Database wrapper
│   ├── middleware/
│   │   ├── cors.ts             # CORS middleware
│   │   └── error-handler.ts   # Global error handler
│   └── utils/
│       ├── crypto.ts           # scrypt, timingSafeEqual
│       ├── date.ts             # Date utilities
│       ├── math.ts             # clamp, parseDifficulty
│       └── validation.ts       # parseJSON, normalizeUsername
│
└── features/                   # Feature modules
    ├── users/
    │   ├── repository.ts
    │   ├── service.ts
    │   ├── routes.ts
    │   └── types.ts
    │
    ├── auth/
    │   ├── repository.ts
    │   ├── service.ts
    │   ├── routes.ts
    │   └── types.ts
    │
    ├── questions/
    │   ├── repository.ts
    │   ├── service.ts
    │   ├── routes.ts
    │   ├── selection-strategy.ts
    │   └── types.ts
    │
    ├── sessions/
    │   ├── repository.ts
    │   ├── service.ts
    │   ├── routes.ts
    │   └── types.ts
    │
    ├── skills/
    │   ├── repository.ts
    │   ├── service.ts
    │   ├── algorithms.ts
    │   └── types.ts
    │
    ├── scoring/
    │   ├── service.ts
    │   ├── calculator.ts
    │   └── types.ts
    │
    ├── streaks/
    │   ├── repository.ts
    │   ├── service.ts
    │   └── types.ts
    │
    ├── answers/
    │   ├── repository.ts
    │   ├── service.ts
    │   └── types.ts
    │
    └── generation/
        ├── service.ts
        ├── openai-client.ts
        ├── translator.ts
        ├── validator.ts
        ├── routes.ts
        └── types.ts
```

### Dependency Injection Flow

```
index.ts (bootstrap)
  │
  ├─► DatabaseClient(env.DB)
  ├─► KVCache(env.KV)
  │
  ├─► Repositories (receive DatabaseClient)
  │   ├─ UserRepository
  │   ├─ AuthRepository
  │   ├─ QuestionRepository
  │   ├─ SessionRepository
  │   ├─ SkillRepository
  │   ├─ StreakRepository
  │   └─ AnswerRepository
  │
  ├─► Services (receive repos + other services)
  │   ├─ UserService(userRepo, dbClient)
  │   ├─ AuthService(authRepo, kvCache, env)
  │   ├─ QuestionService(questionRepo, skillService, kvCache)
  │   ├─ SessionService(sessionRepo, answerService, skillService,
  │   │                  streakService, questionService, scoringService, dbClient)
  │   ├─ SkillService(skillRepo)
  │   ├─ ScoringService()
  │   ├─ StreakService(streakRepo)
  │   ├─ AnswerService(answerRepo)
  │   └─ GenerationService(dbClient, openaiClient, translator, validator)
  │
  └─► Routes Registration
      ├─ registerUserRoutes(app, userService)
      ├─ registerAuthRoutes(app, authService)
      ├─ registerQuestionRoutes(app, questionService)
      ├─ registerSessionRoutes(app, sessionService)
      └─ registerGenerationRoutes(app, generationService, adminKey)
```

---

## ⚙️ Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...          # OpenAI API key
ADMIN_KEY=your-secret-key      # Admin endpoint authentication

# Optional (with defaults)
SESSION_TTL_SECONDS=2592000    # 30 days
NIGHTLY_TARGET=100             # Questions per cron run
MAX_TOTAL_QUESTIONS=100000     # Total question limit
```

### Constants (`config/constants.ts`)

```typescript
export const APP_CONFIG = {
  // Skill system
  INITIAL_SKILL_MU: 3.0,
  MIN_SKILL: 1.0,
  MAX_SKILL: 6.0,

  // Scoring
  BASE_SCORE_MULTIPLIER: 100,
  MAX_SPEED_BONUS: 0.3,
  MAX_STREAK_MULTIPLIER: 0.5,
  STREAK_INCREMENT_PER_LEVEL: 0.1,

  // Timing
  FAST_THRESHOLD_MS: 5000,
  NORMAL_THRESHOLD_MS: 12000,

  // Speed deltas
  SPEED_DELTAS: {
    correct: { fast: 0.30, normal: 0.20, slow: 0.10 },
    wrong: { fast: -0.30, normal: -0.20, slow: -0.10 },
  },

  // Generation
  DAILY_GENERATION_COUNT: 100,
  MAX_TOTAL_QUESTIONS: 100000,
  SUPPORTED_LANGUAGES: ['en', 'ru', 'es'],
  GENERATION_BATCH_SIZE: 10,

  // Categories
  ALL_CATEGORIES: [
    'general', 'science', 'history', 'geography', 'tech',
    'movies', 'music', 'sports', 'literature', 'nature',
    'popculture', 'logic', 'math'
  ],

  // Cache TTL
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60,       // 7 days
  SEEN_QUESTIONS_TTL_SECONDS: 30 * 24 * 60 * 60, // 30 days
  RESET_TOKEN_TTL_SECONDS: 15 * 60,            // 15 minutes

  // Validation
  MIN_PASSWORD_LENGTH: 8,
  MIN_USERNAME_LENGTH: 3,
  MAX_USERNAME_LENGTH: 20,

  // Question selection
  QUESTION_FETCH_MULTIPLIER: 5,
  MAX_DIFFICULTY_RANGE_EXPANSION: 3,

  // Topic preferences
  MIN_TOPIC_WEIGHT: -5,
  MAX_TOPIC_WEIGHT: 5,
  TOPIC_ACCURACY_THRESHOLD_HIGH: 0.7,
  TOPIC_ACCURACY_THRESHOLD_LOW: 0.3,
}
```

---

## 🔒 Security Features

1. **Password Security:**
   - scrypt hashing (N=2^15, r=8, p=1, dkLen=32)
   - Random 16-byte salt per password
   - Constant-time comparison (timing attack prevention)

2. **SQL Injection Prevention:**
   - All queries use parameterized `.bind()`
   - No string interpolation in SQL

3. **Session Security:**
   - UUID v4 session tokens
   - KV storage with TTL (auto-expiration)
   - Bearer token authentication

4. **Input Validation:**
   - Username normalization (case-insensitive uniqueness)
   - Password length enforcement (≥8 chars)
   - Request body validation

5. **Session Ownership:**
   - Validates session belongs to user before modification
   - Prevents cross-user session manipulation

---

## 📊 Performance Optimizations

1. **Database:**
   - Batch operations (single transaction for multi-insert)
   - Proper indexes on frequently queried columns
   - Question translation structure (avoids data duplication)

2. **Caching:**
   - Seen questions in KV (fast lookup)
   - Session tokens in KV (no DB hit)
   - Reset tokens in KV (ephemeral data)

3. **Question Selection:**
   - Fetch multiplier (5x) to reduce round trips
   - Progressive widening (up to 3 expansions)
   - Client-side validation (no /answer endpoint overhead)

4. **API Efficiency:**
   - Batch translation (10 questions per API call)
   - Reuse OpenAI client connection
   - Appropriate model selection (GPT-4o-mini for generation, GPT-3.5-turbo for translation)

---

## 🚀 Deployment

### Cloudflare Workers Setup

```bash
# Install dependencies
npm install

# Run migrations
npx wrangler d1 migrations apply quiz-db

# Deploy to production
npx wrangler deploy

# Set environment variables
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ADMIN_KEY
```

### Scheduled Cron

Add to `wrangler.toml`:

```toml
[triggers]
crons = ["0 1 * * *"]  # Daily at 01:00 UTC
```

---

## 📈 Monitoring & Logging

All logs use structured format:

```typescript
console.log('[ServiceName] Action:', data)
console.warn('[ServiceName] Warning:', issue)
console.error('[ServiceName] Error:', error.message, error.stack)
```

**Key Metrics to Monitor:**
- Question generation success rate
- Translation completeness
- API response times
- Duplicate question rate
- User skill distribution
- Session completion rate

---

## 🔮 Future Enhancements

1. **Real-time Multiplayer:** WebSocket support for live quiz battles
2. **Leaderboards:** Global/regional ranking system
3. **Achievements:** Badges and milestones
4. **Social Features:** Friends, challenges, sharing
5. **Advanced Analytics:** Performance trends, weak areas
6. **Custom Categories:** User-created quiz topics
7. **Image Questions:** Support for visual quizzes
8. **Voice Mode:** Audio questions and answers
9. **Adaptive Learning:** ML-based difficulty prediction
10. **Regional Content:** Country-specific questions

---

## 📝 License & Credits

**License:** MIT
**Author:** unQuizzable Team
**Tech Stack:**
- Cloudflare Workers (Edge runtime)
- Hono v4 (Web framework)
- D1 (SQLite database)
- KV (Key-value store)
- OpenAI GPT-4o-mini & GPT-3.5-turbo (AI generation)
- scrypt-js (Password hashing)

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
**Documentation:** Complete ✅
