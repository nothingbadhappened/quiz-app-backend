import { Hono } from 'hono'
import { Env } from './types/env'
import { runQuestionGeneration } from './cron'

// Shared infrastructure
import { KVCache } from './shared/cache/kv-client'
import { DatabaseClient } from './shared/database/client'
import { corsMiddleware } from './shared/middleware/cors'
import { errorHandler } from './shared/middleware/error-handler'

// User feature
import { UserRepository } from './features/users/repository'
import { UserService } from './features/users/service'
import { registerUserRoutes } from './features/users/routes'

// Streak feature
import { StreakRepository } from './features/streaks/repository'
import { StreakService } from './features/streaks/service'

// Skill feature
import { SkillRepository } from './features/skills/repository'
import { SkillService } from './features/skills/service'

// Scoring feature
import { ScoringService } from './features/scoring/service'

// Answer feature
import { AnswerRepository } from './features/answers/repository'
import { AnswerService } from './features/answers/service'

// Auth feature
import { AuthRepository } from './features/auth/repository'
import { AuthService } from './features/auth/service'
import { registerAuthRoutes } from './features/auth/routes'

// Question feature
import { QuestionRepository } from './features/questions/repository'
import { QuestionService } from './features/questions/service'
import { registerQuestionRoutes } from './features/questions/routes'

// Session feature
import { SessionRepository } from './features/sessions/repository'
import { SessionService } from './features/sessions/service'
import { registerSessionRoutes } from './features/sessions/routes'

// Generation feature
import { OpenAIClient } from './features/generation/openai-client'
import { QuestionTranslator } from './features/generation/translator'
import { QuestionValidator } from './features/generation/validator'
import { GenerationService } from './features/generation/service'
import { registerGenerationRoutes } from './features/generation/routes'

// Bootstrap function to wire up all dependencies
function bootstrap(env: Env) {
  // Shared infrastructure
  const kvCache = new KVCache(env.KV)
  const dbClient = new DatabaseClient(env.DB)

  // Repositories
  const userRepo = new UserRepository(dbClient)
  const streakRepo = new StreakRepository(dbClient)
  const skillRepo = new SkillRepository(dbClient)
  const answerRepo = new AnswerRepository(dbClient)
  const authRepo = new AuthRepository(dbClient)
  const questionRepo = new QuestionRepository(dbClient)
  const sessionRepo = new SessionRepository(dbClient)

  // Services
  const userService = new UserService(userRepo, dbClient)
  const streakService = new StreakService(streakRepo)
  const skillService = new SkillService(skillRepo)
  const scoringService = new ScoringService()
  const answerService = new AnswerService(answerRepo)
  const authService = new AuthService(authRepo, kvCache, env)
  const questionService = new QuestionService(questionRepo, skillService, kvCache)
  const sessionService = new SessionService(
    sessionRepo,
    answerService,
    skillService,
    streakService,
    questionService,
    scoringService,
    dbClient
  )

  // Generation services
  const openaiClient = new OpenAIClient(env.OPENAI_API_KEY)
  const translator = new QuestionTranslator(openaiClient)
  const validator = new QuestionValidator()
  const generationService = new GenerationService(dbClient, openaiClient, translator, validator)

  return {
    userService,
    authService,
    questionService,
    sessionService,
    generationService,
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Create a new Hono instance per request to avoid accumulating routes
    const app = new Hono<{ Bindings: Env }>()

    // Apply middleware
    app.use('*', errorHandler)
    app.use('*', corsMiddleware)
    app.options('*', (c) => c.body(null, 204))

    // Health check
    app.get('/health', (c) => c.json({ ok: true }))

    // Initialize services
    const services = bootstrap(env)

    // Register routes
    registerUserRoutes(app, services.userService)
    registerAuthRoutes(app, services.authService)
    registerQuestionRoutes(app, services.questionService)
    registerSessionRoutes(app, services.sessionService)
    registerGenerationRoutes(app, services.generationService, env.ADMIN_KEY)

    return app.fetch(request, env, ctx)
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await runQuestionGeneration(env)
  },
}
