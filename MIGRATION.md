# Quiz App Backend - Feature-Based Architecture Migration Guide

## Table of Contents
1. [Overview](#overview)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Feature Breakdown](#feature-breakdown)
6. [Directory Structure](#directory-structure)
7. [Code Organization Patterns](#code-organization-patterns)
8. [Implementation Guidelines](#implementation-guidelines)
9. [Testing & Validation](#testing--validation)
10. [Rollback Plan](#rollback-plan)

---

## Overview

### Current State
- **File**: Single monolithic `src/index.ts` (1,137 lines)
- **Routes**: 13+ endpoints across 8 feature domains
- **Architecture**: All logic inline within route handlers
- **Maintainability**: Low - difficult to navigate and modify
- **Testability**: Low - tightly coupled, hard to unit test

### Target State
- **Structure**: Feature-based modular architecture
- **Separation**: Routes → Services → Repositories
- **Patterns**: Service layer, simple dependency injection, repository pattern
- **Maintainability**: High - clear separation of concerns
- **Testability**: High - isolated, injectable components

### Benefits of Refactoring
✅ **Scalability** - Easy to add new features without affecting existing code
✅ **Maintainability** - Changes localized to specific features
✅ **Testability** - Isolated units can be tested independently
✅ **Readability** - Clear structure, easy to navigate
✅ **Team Collaboration** - Multiple developers can work on different features
✅ **Code Reusability** - Services can be shared across features

---

## Current Architecture Analysis

### Tech Stack
- **Runtime**: Cloudflare Workers (serverless edge computing)
- **Framework**: Hono v4.10.4
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV (sessions, seen questions)
- **AI**: OpenAI API (GPT-4o-mini, GPT-3.5-turbo)
- **Language**: TypeScript v5.5.2

### Current Route Structure
```
POST   /register                    # Anonymous/named user registration
POST   /auth/register               # Password-based registration
POST   /auth/login                  # User login
POST   /auth/logout                 # Session invalidation
POST   /auth/request-password-reset # Password reset request
POST   /auth/reset-password         # Execute password reset
GET    /me                          # Get current user profile
POST   /session/start               # Start quiz session
POST   /session/finish              # Complete session with batch updates
GET    /quiz/next                   # Adaptive question selection
POST   /admin/generate              # Manual question generation
POST   /admin/trigger-cron          # Trigger scheduled generation
GET    /health                      # Health check
CRON   01:00 UTC daily              # Automated question generation
```

### Database Schema

#### Core Tables
- **user** - User accounts and authentication
- **question_base** - Language-agnostic question data
- **question_translation** - Multi-language translations (en/ru/es)
- **user_answer** - Answer history

#### Game Mechanics Tables
- **user_skill** - Adaptive skill level (μ)
- **run_session** - Quiz session records
- **streak_state** - Current and best streaks
- **topic_pref** - User topic preferences

### Current Problems
1. **God Object** - Single file handles all concerns
2. **Mixed Responsibilities** - Routes contain business logic, data access, and algorithms
3. **Tight Coupling** - Hard to modify one feature without affecting others
4. **No Abstraction** - Direct database queries in route handlers
5. **Testing Challenges** - Cannot unit test individual components
6. **Code Duplication** - Similar patterns repeated across routes
7. **Poor Discoverability** - Hard to find specific functionality

---

## Target Architecture

### Architectural Principles

#### 1. Feature-Based Organization
Each feature domain is self-contained with clear boundaries:
```
features/
└── auth/
    ├── routes.ts       # HTTP route handlers
    ├── service.ts      # Business logic
    ├── repository.ts   # Data access
    └── types.ts        # Type definitions
```

#### 2. Layered Architecture
```
┌─────────────────────────────────┐
│   Routes (HTTP handlers)        │  ← Thin layer, validation only
├─────────────────────────────────┤
│   Services (business logic)     │  ← Core logic, orchestration
├─────────────────────────────────┤
│   Repositories (data access)    │  ← Database queries only
├─────────────────────────────────┤
│   Database / Cache / External   │  ← Infrastructure
└─────────────────────────────────┘
```

#### 3. Dependency Flow
```
Routes → Services → Repositories → Database
   ↓         ↓           ↓
 Types    Types      Types
```

#### 4. Simple Dependency Injection
```typescript
// Services receive dependencies via constructor
class AuthService {
  constructor(
    private userRepo: UserRepository,
    private kvCache: KVCache
  ) {}
}

// Instantiated in index.ts with real dependencies
const authService = new AuthService(userRepository, kvCache);
```

### Feature Domains

| Feature | Responsibilities | Dependencies |
|---------|-----------------|--------------|
| **auth** | Login, logout, password management, sessions | users, cache |
| **users** | Registration, profiles, user data | database |
| **skills** | μ calculation, skill adaptation, topic preferences | database |
| **streaks** | Streak tracking and updates | database |
| **scoring** | Score calculation, speed bonuses, multipliers | skills |
| **answers** | Answer validation, history tracking | database |
| **questions** | Question selection, difficulty adaptation, language support | skills, answers, cache |
| **sessions** | Session lifecycle, mode handling | answers, skills, streaks, scoring, questions |
| **generation** | AI question generation, translation, validation | database, OpenAI |

### Cross-Feature Dependencies
```
sessions
  ├─→ answers
  ├─→ skills
  ├─→ streaks
  ├─→ scoring
  └─→ questions

questions
  ├─→ skills
  └─→ answers (for seen tracking)

auth
  ├─→ users
  └─→ cache
```

---

## Migration Strategy

### Phase 1: Foundation (Shared Infrastructure)
**Goal**: Create reusable shared components

1. **Create shared/database/**
   - `client.ts` - D1 database wrapper
   - `types.ts` - Common database types

2. **Create shared/cache/**
   - `kv-client.ts` - KV cache wrapper
   - `types.ts` - Cache types

3. **Create shared/utils/**
   - `validation.ts` - Input validation helpers
   - `crypto.ts` - Scrypt password hashing
   - `math.ts` - Math utilities (clamp, etc.)
   - `date.ts` - Date/time utilities

4. **Create shared/middleware/**
   - `cors.ts` - CORS configuration
   - `error-handler.ts` - Global error handling

5. **Create config/**
   - `constants.ts` - App constants (DAYS_UNTIL_RESET, etc.)

6. **Create types/**
   - `env.ts` - Cloudflare environment bindings

### Phase 2: Core Features (Independent)
**Goal**: Extract features with minimal dependencies

1. **features/users/**
   - User registration and profile management
   - No external feature dependencies

2. **features/streaks/**
   - Streak calculation logic
   - Independent service

3. **features/skills/**
   - μ calculation and topic preferences
   - Independent algorithms

4. **features/scoring/**
   - Score calculation algorithms
   - Depends only on skills (for μ)

5. **features/answers/**
   - Answer validation and storage
   - Minimal dependencies

### Phase 3: Dependent Features
**Goal**: Extract features that depend on Phase 2

1. **features/auth/**
   - Depends on: users, cache
   - Authentication and session management

2. **features/questions/**
   - Depends on: skills, answers, cache
   - Question selection strategy

3. **features/generation/**
   - Independent (admin-only)
   - AI question generation

### Phase 4: Orchestration Features
**Goal**: Extract complex features that coordinate multiple services

1. **features/sessions/**
   - Depends on: answers, skills, streaks, scoring, questions
   - Session lifecycle management

### Phase 5: Composition
**Goal**: Wire everything together

1. **Refactor src/index.ts**
   - Import all feature routes
   - Instantiate services with dependencies
   - Register routes with Hono app

2. **Extract src/cron.ts**
   - Scheduled question generation job
   - Import generation service

### Phase 6: Documentation & Cleanup
**Goal**: Finalize migration

1. Create README.md with new architecture
2. Update comments and documentation
3. Remove unused code
4. Verify all routes work

---

## Feature Breakdown

### 1. Authentication (`features/auth/`)

#### Responsibilities
- User login/logout
- Session token management (KV)
- Password reset flow
- Bearer token validation

#### Files
```typescript
// routes.ts
export function registerAuthRoutes(app: Hono, service: AuthService) {
  app.post('/auth/register', async (c) => { ... });
  app.post('/auth/login', async (c) => { ... });
  app.post('/auth/logout', async (c) => { ... });
  app.post('/auth/request-password-reset', async (c) => { ... });
  app.post('/auth/reset-password', async (c) => { ... });
  app.get('/me', async (c) => { ... });
}

// service.ts
export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private kvCache: KVCache,
    private crypto: CryptoUtils
  ) {}

  async register(username: string, password: string, locale: string) { ... }
  async login(username: string, password: string) { ... }
  async logout(sessionToken: string) { ... }
  async requestPasswordReset(username: string) { ... }
  async resetPassword(token: string, newPassword: string) { ... }
  async getUserByToken(token: string) { ... }
}

// repository.ts
export class AuthRepository {
  constructor(private db: D1Database) {}

  async findUserByUsername(username: string) { ... }
  async updatePassword(userId: string, hash: string, salt: string) { ... }
  async updateLastLogin(userId: string) { ... }
}

// types.ts
export interface LoginRequest { ... }
export interface SessionToken { ... }
```

#### Dependencies
- `features/users/` - User data
- `shared/cache/` - Session storage
- `shared/utils/crypto` - Password hashing

---

### 2. Users (`features/users/`)

#### Responsibilities
- User registration (anonymous + named)
- Profile management
- Username collision handling

#### Files
```typescript
// routes.ts
export function registerUserRoutes(app: Hono, service: UserService) {
  app.post('/register', async (c) => { ... });
}

// service.ts
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private skillRepo: SkillRepository,
    private streakRepo: StreakRepository
  ) {}

  async createUser(username: string, isGuest: boolean, locale: string) { ... }
  async getUserProfile(userId: string) { ... }
}

// repository.ts
export class UserRepository {
  constructor(private db: D1Database) {}

  async createUser(data: CreateUserData) { ... }
  async findById(id: string) { ... }
  async findByUsername(username: string) { ... }
  async usernameExists(username: string) { ... }
}

// types.ts
export interface User { ... }
export interface CreateUserData { ... }
```

#### Dependencies
- `features/skills/` - Initialize skill level
- `features/streaks/` - Initialize streak state

---

### 3. Skills (`features/skills/`)

#### Responsibilities
- Adaptive skill (μ) calculation
- Topic preference learning
- Skill level retrieval

#### Files
```typescript
// service.ts
export class SkillService {
  constructor(
    private skillRepo: SkillRepository,
    private topicPrefRepo: TopicPreferenceRepository
  ) {}

  async getUserSkill(userId: string): Promise<number> { ... }
  async updateSkill(userId: string, delta: number) { ... }
  async updateTopicPreferences(userId: string, updates: TopicUpdate[]) { ... }
  async getTopicPreferences(userId: string) { ... }
}

// repository.ts
export class SkillRepository {
  constructor(private db: D1Database) {}

  async getSkill(userId: string) { ... }
  async updateSkill(userId: string, newMu: number) { ... }
  async initializeSkill(userId: string, initialMu: number = 3.0) { ... }
}

// algorithms.ts
export function calculateSkillDelta(
  correct: boolean,
  speedBucket: 'fast' | 'normal' | 'slow'
): number { ... }

export function clampSkill(mu: number): number { ... }

// types.ts
export interface SkillLevel { ... }
export interface TopicPreference { ... }
```

#### Dependencies
- None (pure business logic)

---

### 4. Streaks (`features/streaks/`)

#### Responsibilities
- Current streak tracking
- Best streak tracking
- Streak updates based on session

#### Files
```typescript
// service.ts
export class StreakService {
  constructor(private streakRepo: StreakRepository) {}

  async getStreak(userId: string) { ... }
  async updateStreak(userId: string, newStreakValue: number) { ... }
  async initializeStreak(userId: string) { ... }
}

// repository.ts
export class StreakRepository {
  constructor(private db: D1Database) {}

  async getStreak(userId: string) { ... }
  async updateStreak(userId: string, current: number, best: number) { ... }
  async initializeStreak(userId: string) { ... }
}

// types.ts
export interface StreakState { ... }
```

#### Dependencies
- None

---

### 5. Scoring (`features/scoring/`)

#### Responsibilities
- Base score calculation
- Speed bonus calculation
- Streak multiplier calculation

#### Files
```typescript
// service.ts
export class ScoringService {
  calculateScore(
    difficulty: number,
    speedBucket: 'fast' | 'normal' | 'slow',
    currentStreak: number
  ): number { ... }

  calculateSpeedBonus(speedBucket: string): number { ... }
  calculateStreakMultiplier(streak: number): number { ... }
}

// calculator.ts
export function getSpeedBucket(timeMs: number): 'fast' | 'normal' | 'slow' { ... }

// types.ts
export interface ScoreCalculation { ... }
```

#### Dependencies
- None (pure calculation logic)

---

### 6. Answers (`features/answers/`)

#### Responsibilities
- Answer validation
- Answer history storage
- Performance tracking

#### Files
```typescript
// service.ts
export class AnswerService {
  constructor(private answerRepo: AnswerRepository) {}

  async recordAnswer(
    userId: string,
    questionId: string,
    correct: boolean
  ) { ... }

  async getUserAnswers(userId: string, limit?: number) { ... }
  async hasAnswered(userId: string, questionId: string) { ... }
}

// repository.ts
export class AnswerRepository {
  constructor(private db: D1Database) {}

  async recordAnswer(userId: string, questionId: string, correct: boolean) { ... }
  async getUserAnswers(userId: string) { ... }
  async getAnswerHistory(userId: string, limit: number) { ... }
}

// types.ts
export interface Answer { ... }
export interface AnswerRecord { ... }
```

#### Dependencies
- None

---

### 7. Questions (`features/questions/`)

#### Responsibilities
- Adaptive question selection
- Language fallback logic
- Difficulty adaptation
- Unseen/seen tracking (KV)
- Progressive difficulty curve

#### Files
```typescript
// routes.ts
export function registerQuestionRoutes(app: Hono, service: QuestionService) {
  app.get('/quiz/next', async (c) => { ... });
}

// service.ts
export class QuestionService {
  constructor(
    private questionRepo: QuestionRepository,
    private skillService: SkillService,
    private answerService: AnswerService,
    private kvCache: KVCache,
    private selectionStrategy: QuestionSelectionStrategy
  ) {}

  async getNextQuestion(
    userId: string,
    lang: string,
    categories?: string[]
  ) { ... }

  async markAsSeen(userId: string, questionId: string) { ... }
  async getSeenQuestions(userId: string): Promise<Set<string>> { ... }
}

// repository.ts
export class QuestionRepository {
  constructor(private db: D1Database) {}

  async findQuestions(criteria: QuestionCriteria) { ... }
  async getQuestionById(baseId: string, lang: string) { ... }
  async getQuestionCount(criteria: QuestionCriteria) { ... }
}

// selection-strategy.ts
export class QuestionSelectionStrategy {
  constructor(private config: SelectionConfig) {}

  selectQuestion(
    questions: Question[],
    userSkill: number,
    seenQuestions: Set<string>,
    recentPerformance: number[]
  ): Question | null { ... }

  calculateDifficultyRange(userSkill: number, performance: number[]): [number, number] { ... }
  sortByProgressiveDifficulty(questions: Question[]): Question[] { ... }
}

// types.ts
export interface Question { ... }
export interface QuestionCriteria { ... }
export interface SelectionConfig { ... }
```

#### Dependencies
- `features/skills/` - Get user skill (μ)
- `features/answers/` - Track seen questions
- `shared/cache/` - KV storage for seen questions

---

### 8. Sessions (`features/sessions/`)

#### Responsibilities
- Session lifecycle (start/finish)
- Mode handling (run/endless/daily)
- Batch updates (answers, skill, streak, seen)
- Score aggregation

#### Files
```typescript
// routes.ts
export function registerSessionRoutes(app: Hono, service: SessionService) {
  app.post('/session/start', async (c) => { ... });
  app.post('/session/finish', async (c) => { ... });
}

// service.ts
export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private answerService: AnswerService,
    private skillService: SkillService,
    private streakService: StreakService,
    private scoringService: ScoringService,
    private questionService: QuestionService
  ) {}

  async startSession(userId: string, mode: string) { ... }

  async finishSession(
    sessionId: string,
    userId: string,
    results: SessionResult[]
  ) { ... }
}

// repository.ts
export class SessionRepository {
  constructor(private db: D1Database) {}

  async createSession(userId: string, mode: string) { ... }
  async completeSession(sessionId: string, data: CompleteSessionData) { ... }
  async getUserSessions(userId: string) { ... }
}

// types.ts
export interface Session { ... }
export interface SessionResult { ... }
export interface CompleteSessionData { ... }
```

#### Dependencies
- `features/answers/` - Record answers
- `features/skills/` - Update skill
- `features/streaks/` - Update streak
- `features/scoring/` - Calculate scores
- `features/questions/` - Mark questions as seen

---

### 9. Generation (`features/generation/`)

#### Responsibilities
- AI question generation (OpenAI)
- Multi-language translation
- Category distribution analysis
- Deduplication and validation
- Batch insertion

#### Files
```typescript
// routes.ts
export function registerGenerationRoutes(app: Hono, service: GenerationService) {
  app.post('/admin/generate', async (c) => { ... });
  app.post('/admin/trigger-cron', async (c) => { ... });
}

// service.ts
export class GenerationService {
  constructor(
    private questionRepo: QuestionRepository,
    private openaiClient: OpenAIClient,
    private translator: QuestionTranslator,
    private validator: QuestionValidator
  ) {}

  async generateQuestions(count: number, adminKey: string) { ... }
  async analyzeCategoryDistribution() { ... }
  async generateForCategory(category: string, count: number) { ... }
}

// openai-client.ts
export class OpenAIClient {
  constructor(private apiKey: string) {}

  async generateQuestion(category: string, difficulty: number) { ... }
  async translateQuestion(question: Question, targetLang: string) { ... }
}

// translator.ts
export class QuestionTranslator {
  constructor(private openaiClient: OpenAIClient) {}

  async translate(question: Question, targetLangs: string[]) { ... }
}

// validator.ts
export class QuestionValidator {
  validateFormat(question: any): boolean { ... }
  validateSources(sources: string[]): boolean { ... }
  isDuplicate(question: Question, existing: Question[]): boolean { ... }
}

// types.ts
export interface GeneratedQuestion { ... }
export interface TranslationResult { ... }
```

#### Dependencies
- External: OpenAI API
- `features/questions/` - Question repository for insertion

---

## Directory Structure

### Complete File Tree
```
src/
├── features/
│   ├── auth/
│   │   ├── routes.ts              # /auth/* routes
│   │   ├── service.ts             # AuthService
│   │   ├── repository.ts          # AuthRepository
│   │   ├── middleware.ts          # Auth middleware (bearer token)
│   │   └── types.ts               # Auth types
│   │
│   ├── users/
│   │   ├── routes.ts              # /register route
│   │   ├── service.ts             # UserService
│   │   ├── repository.ts          # UserRepository
│   │   └── types.ts               # User types
│   │
│   ├── sessions/
│   │   ├── routes.ts              # /session/* routes
│   │   ├── service.ts             # SessionService
│   │   ├── repository.ts          # SessionRepository
│   │   └── types.ts               # Session types
│   │
│   ├── questions/
│   │   ├── routes.ts              # /quiz/next route
│   │   ├── service.ts             # QuestionService
│   │   ├── repository.ts          # QuestionRepository
│   │   ├── selection-strategy.ts  # Adaptive selection logic
│   │   └── types.ts               # Question types
│   │
│   ├── answers/
│   │   ├── service.ts             # AnswerService
│   │   ├── repository.ts          # AnswerRepository
│   │   └── types.ts               # Answer types
│   │
│   ├── skills/
│   │   ├── service.ts             # SkillService
│   │   ├── repository.ts          # SkillRepository (user_skill, topic_pref)
│   │   ├── algorithms.ts          # μ calculation, skill delta
│   │   └── types.ts               # Skill types
│   │
│   ├── scoring/
│   │   ├── service.ts             # ScoringService
│   │   ├── calculator.ts          # Speed bucket, score calculation
│   │   └── types.ts               # Scoring types
│   │
│   ├── generation/
│   │   ├── routes.ts              # /admin/* routes
│   │   ├── service.ts             # GenerationService
│   │   ├── openai-client.ts       # OpenAI API wrapper
│   │   ├── translator.ts          # QuestionTranslator
│   │   ├── validator.ts           # QuestionValidator
│   │   └── types.ts               # Generation types
│   │
│   └── streaks/
│       ├── service.ts             # StreakService
│       ├── repository.ts          # StreakRepository
│       └── types.ts               # Streak types
│
├── shared/
│   ├── database/
│   │   ├── client.ts              # D1Database wrapper
│   │   └── types.ts               # Common DB types
│   │
│   ├── cache/
│   │   ├── kv-client.ts           # KV namespace wrapper
│   │   └── types.ts               # Cache types
│   │
│   ├── utils/
│   │   ├── validation.ts          # Input validators
│   │   ├── crypto.ts              # Scrypt password hashing
│   │   ├── math.ts                # Math utilities (clamp, etc.)
│   │   └── date.ts                # Date/time helpers
│   │
│   └── middleware/
│       ├── cors.ts                # CORS configuration
│       └── error-handler.ts       # Global error handler
│
├── config/
│   └── constants.ts               # App configuration constants
│
├── types/
│   └── env.ts                     # Cloudflare environment bindings
│
├── index.ts                       # App composition & DI
├── cron.ts                        # Scheduled jobs
└── legacy/
    └── index.old.ts               # Backup of original file
```

### File Size Guidelines
- **Routes**: 50-150 lines (thin handlers)
- **Services**: 100-300 lines (business logic)
- **Repositories**: 50-200 lines (data access)
- **Utils**: 20-100 lines per file
- **Types**: 20-100 lines

---

## Code Organization Patterns

### 1. Route Handler Pattern
**Responsibilities**: HTTP handling, validation, response formatting

```typescript
// features/auth/routes.ts
import { Hono } from 'hono';
import { AuthService } from './service';
import { LoginRequest } from './types';

export function registerAuthRoutes(app: Hono, service: AuthService) {
  app.post('/auth/login', async (c) => {
    try {
      // 1. Parse and validate input
      const body = await c.req.json<LoginRequest>();

      if (!body.username || !body.password) {
        return c.json({ error: 'Missing credentials' }, 400);
      }

      // 2. Call service
      const result = await service.login(body.username, body.password);

      // 3. Return response
      return c.json(result);
    } catch (error) {
      // 4. Handle errors
      return c.json({ error: error.message }, 401);
    }
  });
}
```

**Key Principles**:
- Keep routes thin (< 20 lines per handler)
- No business logic in routes
- Only validation and HTTP concerns
- Always handle errors

---

### 2. Service Pattern
**Responsibilities**: Business logic, orchestration, transactions

```typescript
// features/auth/service.ts
import { UserRepository } from '../users/repository';
import { KVCache } from '../../shared/cache/kv-client';
import { CryptoUtils } from '../../shared/utils/crypto';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private kvCache: KVCache,
    private crypto: CryptoUtils
  ) {}

  async login(username: string, password: string) {
    // 1. Fetch user
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Verify password
    const isValid = await this.crypto.verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // 3. Create session token
    const token = uuidv4();
    await this.kvCache.set(`session:${token}`, user.id, { expiresIn: 7 * 24 * 60 * 60 });

    // 4. Update last login
    await this.userRepo.updateLastLogin(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        locale: user.locale
      }
    };
  }

  async logout(sessionToken: string) {
    await this.kvCache.delete(`session:${sessionToken}`);
  }

  async getUserByToken(token: string) {
    const userId = await this.kvCache.get<string>(`session:${token}`);
    if (!userId) return null;

    return this.userRepo.findById(userId);
  }
}
```

**Key Principles**:
- Business logic lives here
- Orchestrate multiple repositories
- Handle transactions
- Return domain objects, not database rows
- Throw descriptive errors

---

### 3. Repository Pattern
**Responsibilities**: Data access, SQL queries

```typescript
// features/auth/repository.ts
import { D1Database } from '@cloudflare/workers-types';

export class AuthRepository {
  constructor(private db: D1Database) {}

  async findUserByUsername(username: string) {
    const normalized = username.toLowerCase();

    const result = await this.db
      .prepare('SELECT * FROM user WHERE username_norm = ?')
      .bind(normalized)
      .first();

    return result || null;
  }

  async updatePassword(
    userId: string,
    hash: string,
    salt: string,
    algo: string,
    params: string
  ) {
    await this.db
      .prepare(`
        UPDATE user
        SET password_hash = ?, password_salt = ?, password_algo = ?,
            password_params = ?, password_updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(hash, salt, algo, params, userId)
      .run();
  }

  async updateLastLogin(userId: string) {
    await this.db
      .prepare('UPDATE user SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(userId)
      .run();
  }
}
```

**Key Principles**:
- Only database operations
- No business logic
- Return raw data or null
- Use prepared statements
- Handle batch operations

---

### 4. Simple Dependency Injection

**Main Application (index.ts)**:
```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Shared
import { KVCache } from './shared/cache/kv-client';
import { CryptoUtils } from './shared/utils/crypto';

// Features
import { UserRepository } from './features/users/repository';
import { UserService } from './features/users/service';
import { registerUserRoutes } from './features/users/routes';

import { AuthRepository } from './features/auth/repository';
import { AuthService } from './features/auth/service';
import { registerAuthRoutes } from './features/auth/routes';

// ... other imports

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const app = new Hono();

    // CORS
    app.use('/*', cors({ origin: '*' }));

    // Shared infrastructure
    const kvCache = new KVCache(env.KV);
    const crypto = new CryptoUtils();

    // Repositories
    const userRepo = new UserRepository(env.DB);
    const authRepo = new AuthRepository(env.DB);
    const skillRepo = new SkillRepository(env.DB);
    // ... other repositories

    // Services
    const userService = new UserService(userRepo, skillRepo, streakRepo);
    const authService = new AuthService(authRepo, kvCache, crypto);
    // ... other services

    // Register routes
    registerUserRoutes(app, userService);
    registerAuthRoutes(app, authService);
    // ... other routes

    // Health check
    app.get('/health', (c) => c.json({ status: 'ok' }));

    return app.fetch(request, env, ctx);
  },

  // Scheduled handler for cron
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // Import and call cron logic
    const { runQuestionGeneration } = await import('./cron');
    await runQuestionGeneration(env);
  }
};
```

**Key Principles**:
- All dependencies created in index.ts
- Passed to constructors (constructor injection)
- No global state or singletons
- Easy to swap implementations for testing
- Clear dependency graph

---

### 5. Type Definitions

**Per-Feature Types**:
```typescript
// features/auth/types.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    locale: string;
  };
}

export interface RegisterRequest {
  username: string;
  password: string;
  locale?: string;
}

export interface PasswordResetRequest {
  username: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

**Shared Types**:
```typescript
// types/env.ts
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  OPENAI_API_KEY: string;
  ADMIN_KEY: string;
}
```

---

## Implementation Guidelines

### 1. Naming Conventions

#### Files
- **Routes**: `routes.ts`
- **Services**: `service.ts` (single service per feature)
- **Repositories**: `repository.ts`
- **Types**: `types.ts`
- **Utilities**: Descriptive names (e.g., `selection-strategy.ts`)

#### Classes
- **Services**: `{Feature}Service` (e.g., `AuthService`)
- **Repositories**: `{Feature}Repository` (e.g., `UserRepository`)
- **Utils**: Descriptive names (e.g., `QuestionSelectionStrategy`)

#### Functions
- **Routes**: `register{Feature}Routes` (e.g., `registerAuthRoutes`)
- **Services**: Descriptive verbs (e.g., `login`, `createUser`, `calculateScore`)
- **Repositories**: CRUD verbs (e.g., `findById`, `create`, `update`, `delete`)

### 2. Error Handling

**Service Layer**:
```typescript
// Throw descriptive errors
throw new Error('User not found');
throw new Error('Invalid credentials');
throw new Error('Session expired');
```

**Route Layer**:
```typescript
try {
  const result = await service.doSomething();
  return c.json(result);
} catch (error) {
  // Map to HTTP status codes
  if (error.message.includes('not found')) {
    return c.json({ error: error.message }, 404);
  }
  if (error.message.includes('Invalid')) {
    return c.json({ error: error.message }, 400);
  }
  return c.json({ error: error.message }, 500);
}
```

**Global Error Handler** (optional):
```typescript
// shared/middleware/error-handler.ts
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (error) {
      console.error('Unhandled error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}
```

### 3. Database Transactions

For batch operations (like `/session/finish`):
```typescript
async finishSession(sessionId: string, userId: string, results: SessionResult[]) {
  // Build batch statements
  const statements = [];

  // 1. Update session
  statements.push(
    this.db.prepare('UPDATE run_session SET ended_at = ?, score = ? WHERE id = ?')
      .bind(new Date().toISOString(), totalScore, sessionId)
  );

  // 2. Record answers
  for (const result of results) {
    statements.push(
      this.db.prepare('INSERT OR REPLACE INTO user_answer VALUES (?, ?, ?, ?)')
        .bind(userId, result.questionId, result.correct ? 1 : 0, new Date().toISOString())
    );
  }

  // 3. Update skill
  statements.push(
    this.db.prepare('UPDATE user_skill SET mu = ?, updated_at = ? WHERE user_id = ?')
      .bind(newMu, new Date().toISOString(), userId)
  );

  // Execute atomically
  await this.db.batch(statements);
}
```

### 4. KV Cache Best Practices

```typescript
// Namespace keys consistently
const SESSION_PREFIX = 'session:';
const SEEN_PREFIX = 'seen:';

// Use TTL for expiring data
await kvCache.set(`${SESSION_PREFIX}${token}`, userId, { expiresIn: 7 * 24 * 60 * 60 });

// Store complex objects as JSON
const seenQuestions = new Set<string>();
await kvCache.set(`${SEEN_PREFIX}${userId}`, JSON.stringify([...seenQuestions]), {
  expiresIn: 30 * 24 * 60 * 60
});

// Parse on retrieval
const data = await kvCache.get<string>(`${SEEN_PREFIX}${userId}`);
const seen = data ? new Set(JSON.parse(data)) : new Set();
```

### 5. Async/Await Best Practices

```typescript
// ✅ Good: Parallel independent operations
const [user, skill, streak] = await Promise.all([
  userRepo.findById(userId),
  skillRepo.getSkill(userId),
  streakRepo.getStreak(userId)
]);

// ❌ Bad: Sequential when not needed
const user = await userRepo.findById(userId);
const skill = await skillRepo.getSkill(userId); // Could run in parallel
const streak = await streakRepo.getStreak(userId); // Could run in parallel
```

### 6. Validation

**Input Validation**:
```typescript
// shared/utils/validation.ts
export function validateUsername(username: string): boolean {
  return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateLocale(locale: string): boolean {
  return ['en', 'ru', 'es'].includes(locale);
}
```

**Usage in Routes**:
```typescript
const { username, password } = await c.req.json();

if (!validateUsername(username)) {
  return c.json({ error: 'Invalid username format' }, 400);
}

if (!validatePassword(password)) {
  return c.json({ error: 'Password must be at least 8 characters' }, 400);
}
```

### 7. Constants Management

```typescript
// config/constants.ts
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
  NORMAL_THRESHOLD_MS: 15000,

  // Generation
  DAILY_GENERATION_COUNT: 100,
  MAX_TOTAL_QUESTIONS: 100000,
  SUPPORTED_LANGUAGES: ['en', 'ru', 'es'],

  // Cache TTL
  SESSION_TTL_SECONDS: 7 * 24 * 60 * 60, // 7 days
  SEEN_QUESTIONS_TTL_SECONDS: 30 * 24 * 60 * 60, // 30 days
  RESET_TOKEN_TTL_SECONDS: 60 * 60, // 1 hour
};
```

### 8. Comments & Documentation

**Service Methods**:
```typescript
/**
 * Calculates the next difficulty level based on user skill and recent performance
 * @param userSkill - Current user μ value (1.0 - 6.0)
 * @param recentAccuracy - Array of recent correct/incorrect (last 5 questions)
 * @returns Target difficulty level (1-6)
 */
calculateTargetDifficulty(userSkill: number, recentAccuracy: boolean[]): number {
  // Implementation
}
```

**Complex Logic**:
```typescript
// Adaptive difficulty range calculation
// Widens range if user is struggling (< 40% accuracy) or excelling (> 80%)
const baseRange = 1;
const expandedRange = recentAccuracy < 0.4 || recentAccuracy > 0.8 ? 2 : 1;
```

---

## Testing & Validation

### Manual Testing Checklist

After refactoring each feature, test these scenarios:

#### Authentication
- [ ] POST `/auth/register` - Create new account
- [ ] POST `/auth/login` - Login with valid credentials
- [ ] POST `/auth/login` - Login with invalid credentials (should fail)
- [ ] GET `/me` - Get profile with valid token
- [ ] GET `/me` - Get profile with invalid token (should fail)
- [ ] POST `/auth/logout` - Logout and invalidate token
- [ ] POST `/auth/request-password-reset` - Request reset
- [ ] POST `/auth/reset-password` - Reset with valid token

#### Users
- [ ] POST `/register` - Create guest user
- [ ] POST `/register` - Create named user
- [ ] Username collision handling works

#### Sessions
- [ ] POST `/session/start` - Start run mode
- [ ] POST `/session/start` - Start endless mode
- [ ] POST `/session/start` - Start daily mode
- [ ] POST `/session/finish` - Complete session with correct answers
- [ ] POST `/session/finish` - Complete session with mixed answers
- [ ] Verify skill (μ) updates correctly
- [ ] Verify streak updates correctly
- [ ] Verify answers are recorded

#### Questions
- [ ] GET `/quiz/next` - Get question in English
- [ ] GET `/quiz/next` - Get question in Russian
- [ ] GET `/quiz/next` - Get question in Spanish
- [ ] GET `/quiz/next` - Filter by category
- [ ] Verify adaptive difficulty works
- [ ] Verify unseen questions prioritized
- [ ] Verify seen questions cached in KV

#### Generation (Admin)
- [ ] POST `/admin/generate` - Generate questions with valid admin key
- [ ] POST `/admin/generate` - Reject with invalid admin key
- [ ] POST `/admin/trigger-cron` - Trigger manual generation
- [ ] Verify questions generated in all languages
- [ ] Verify deduplication works

#### Health
- [ ] GET `/health` - Returns OK

### Integration Testing

**Test Session Flow**:
```typescript
// 1. Register user
const registerRes = await fetch('/register', {
  method: 'POST',
  body: JSON.stringify({ username: 'test_user', isGuest: false })
});
const { userId } = await registerRes.json();

// 2. Start session
const startRes = await fetch('/session/start', {
  method: 'POST',
  headers: { 'x-user': userId },
  body: JSON.stringify({ mode: 'run' })
});
const { sessionId } = await startRes.json();

// 3. Get questions
const q1 = await fetch('/quiz/next?lang=en', {
  headers: { 'x-user': userId }
}).then(r => r.json());

// 4. Finish session
const finishRes = await fetch('/session/finish', {
  method: 'POST',
  headers: { 'x-user': userId },
  body: JSON.stringify({
    sessionId,
    results: [{ questionId: q1.id, correct: true, timeMs: 3000 }]
  })
});

// 5. Verify updates
const profile = await fetch('/me', {
  headers: { 'x-user': userId }
}).then(r => r.json());

console.log('Skill updated:', profile.mu);
console.log('Streak:', profile.streak);
```

### Verification Steps

After completing migration:

1. **Compare Routes**
   - Ensure all 13 routes still exist
   - Verify same request/response formats

2. **Database Integrity**
   - Run sample queries to verify data access works
   - Check batch operations execute correctly

3. **KV Cache**
   - Verify session tokens work
   - Verify seen questions cache works
   - Check TTL expiration

4. **Cron Job**
   - Manually trigger cron
   - Verify questions generated
   - Check all 3 languages present

5. **Error Handling**
   - Test invalid inputs
   - Test missing auth
   - Verify proper error messages and status codes

---

## Rollback Plan

### Backup Strategy

**Before starting refactoring**:
```bash
# 1. Create backup directory
mkdir src/legacy

# 2. Copy current index.ts
cp src/index.ts src/legacy/index.old.ts

# 3. Commit current state
git add .
git commit -m "Pre-refactor backup"
git tag pre-refactor

# 4. Create refactor branch
git checkout -b feature/refactor-architecture
```

### Rollback Procedure

If refactoring causes issues:

**Option 1: Git Revert**
```bash
# Restore from backup tag
git checkout pre-refactor

# Or reset to backup commit
git reset --hard <commit-hash>
```

**Option 2: Manual Rollback**
```bash
# Restore backup file
cp src/legacy/index.old.ts src/index.ts

# Rebuild
npm run build

# Deploy
npm run deploy
```

**Option 3: Incremental Rollback**
```bash
# Cherry-pick specific commits to revert
git revert <commit-hash>

# Or revert specific files
git checkout HEAD~1 -- src/features/problematic-feature/
```

### Smoke Testing Post-Rollback

After rollback, verify:
- [ ] Application starts without errors
- [ ] Health check responds
- [ ] User login works
- [ ] Question retrieval works
- [ ] Session flow works

---

## Migration Execution Timeline

### Estimated Timeline (All-at-once approach)

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Shared infrastructure (database, cache, utils, middleware, config) | 2-3 hours |
| **Phase 2** | Core features (users, streaks, skills, scoring, answers) | 4-5 hours |
| **Phase 3** | Dependent features (auth, questions, generation) | 3-4 hours |
| **Phase 4** | Orchestration (sessions) | 2-3 hours |
| **Phase 5** | Composition (index.ts, cron.ts) | 1-2 hours |
| **Phase 6** | Testing & validation | 2-3 hours |
| **Total** | Full refactor | **14-20 hours** |

### Daily Breakdown (Suggested)

**Day 1: Foundation (6-8 hours)**
- Morning: Phase 1 (shared infrastructure)
- Afternoon: Phase 2 start (users, streaks, skills)

**Day 2: Core Features (6-8 hours)**
- Morning: Phase 2 finish (scoring, answers)
- Afternoon: Phase 3 (auth, questions)

**Day 3: Completion (4-6 hours)**
- Morning: Phase 3 finish (generation), Phase 4 (sessions)
- Afternoon: Phase 5 (composition), Phase 6 (testing)

---

## Success Criteria

The refactoring is complete when:

✅ All 13 routes are functional
✅ All tests pass (manual checklist)
✅ No regression in functionality
✅ Cron job works as before
✅ Database queries execute correctly
✅ KV cache operations work
✅ Code is organized into features
✅ Services use dependency injection
✅ Repositories handle data access
✅ No business logic in route handlers
✅ File sizes follow guidelines (< 300 lines)
✅ All dependencies clearly defined
✅ Documentation updated

---

## Next Steps

1. **Review this document** - Ensure you understand the architecture
2. **Approve migration plan** - Confirm approach and timeline
3. **Create backup** - Tag current state in git
4. **Execute Phase 1** - Build shared infrastructure
5. **Iterate through features** - Follow phase order
6. **Test continuously** - Verify each feature as you go
7. **Deploy to staging** - Test in production-like environment
8. **Production deployment** - Roll out refactored code

---

## Questions & Clarifications

Before starting, clarify:

1. **Are there any additional routes** not in the original analysis?
2. **Are there any hidden dependencies** between features?
3. **Should we maintain backward compatibility** with any external clients?
4. **Are there any performance requirements** to maintain?
5. **Should we add any logging/monitoring** during refactor?

---

## Appendix A: Original Route Analysis

Comprehensive list of all routes from current `src/index.ts`:

| Route | Method | Handler Line | Feature Domain | Dependencies |
|-------|--------|-------------|----------------|--------------|
| `/register` | POST | ~100 | users | skills, streaks |
| `/auth/register` | POST | ~200 | auth | users |
| `/auth/login` | POST | ~250 | auth | users, cache |
| `/auth/logout` | POST | ~300 | auth | cache |
| `/auth/request-password-reset` | POST | ~350 | auth | users, cache |
| `/auth/reset-password` | POST | ~400 | auth | users, cache |
| `/me` | GET | ~450 | auth | users |
| `/session/start` | POST | ~500 | sessions | - |
| `/session/finish` | POST | ~600 | sessions | answers, skills, streaks, scoring, questions |
| `/quiz/next` | GET | ~800 | questions | skills, answers, cache |
| `/admin/generate` | POST | ~1000 | generation | OpenAI |
| `/admin/trigger-cron` | POST | ~1050 | generation | OpenAI |
| `/health` | GET | ~1100 | - | - |

---

## Appendix B: Database Schema Reference

Quick reference for all tables:

**user**: id, username, username_norm, locale, password_hash, password_salt, password_algo, password_params, last_login_at, password_updated_at, created_at

**question_base**: id, category, difficulty, region, source_urls, source_titles, verified, created_at

**question_translation**: base_id, lang, prompt, options, correct_idx, created_at

**user_answer**: user_id, question_id, correct, answered_at

**user_skill**: user_id, mu, updated_at

**run_session**: id, user_id, mode, started_at, ended_at, score, lives_used, max_streak

**streak_state**: user_id, current_streak, best_streak, updated_at

**topic_pref**: user_id, topic, weight

---

## Appendix C: OpenAI Integration Details

**Models Used**:
- `gpt-4o-mini` - Question generation
- `gpt-3.5-turbo` - Translation (fallback)

**Generation Prompt Structure**:
```
Generate a {category} quiz question at difficulty {1-6}.
Return JSON with: prompt, options (4 answers), correct_idx, source_urls, source_titles
```

**Translation Prompt Structure**:
```
Translate this quiz question to {lang}.
Original: {question}
Return same JSON structure with translated content.
```

**Error Handling**:
- Retry failed requests (max 3 attempts)
- Skip invalid responses
- Log failed generations
- Continue with valid questions

---

*This migration guide should be treated as a living document. Update as you discover new patterns or encounter challenges during refactoring.*
