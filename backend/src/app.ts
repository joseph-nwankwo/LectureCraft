import './config/env'
import path from 'path'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'

import { env } from './config/env'
import { prisma } from './config/database'
import { logger } from './utils/logger'
import { recordHttpMetrics } from './utils/metrics'
import { errorHandler } from './middleware/errorHandler'
import { defaultLimiter, authLimiter, aiLimiter } from './middleware/rateLimiter'
import { requestIdMiddleware } from './middleware/requestId.middleware'
import { sanitizeInput, securityHeaders } from './middleware/security.middleware'
import { roleService } from './services/role/role.service'

import contextExtractRoutes from './routes/context-extract.routes'
import authRoutes         from './routes/auth.routes'
import coursesRoutes      from './routes/courses.routes'
import documentsRoutes    from './routes/documents.routes'
import aiRoutes           from './routes/ai.routes'
import usersRoutes        from './routes/users.routes'
import institutionsRoutes from './routes/institutions.routes'
import academicRoutes     from './routes/academic.routes'
import generateRoutes     from './routes/generate.routes'
import templatesRoutes    from './routes/templates.routes'
import libraryRoutes      from './routes/library.routes'
import foldersRoutes      from './routes/folders.routes'
import tagsRoutes         from './routes/tags.routes'
import commentsRoutes     from './routes/comments.routes'
import approvalRoutes     from './routes/approval.routes'
import shareRoutes        from './routes/share.routes'
import exportCenterRoutes from './routes/export-center.routes'
import markingRoutes      from './routes/marking.routes'
import questionsRoutes    from './routes/questions.routes'
import assessmentsRoutes  from './routes/assessments.routes'
import rubricsRoutes      from './routes/rubrics.routes'
import outcomesRoutes     from './routes/outcomes.routes'
import moderationRoutes   from './routes/moderation.routes'
import analyticsRoutes    from './routes/analytics.routes'
import reportsRoutes      from './routes/reports.routes'
import insightsRoutes     from './routes/insights.routes'
import billingRoutes      from './routes/billing.routes'
import collaborationRoutes from './routes/collaboration.routes'
import metricsRoutes      from './routes/metrics.routes'
import studentRoutes      from './routes/student.routes'
import enrollmentRoutes   from './routes/enrollment.routes'
import submissionsRoutes  from './routes/submissions.routes'
import plagiarismRoutes   from './routes/plagiarism.routes'
import { createSocketGateway } from './gateway/socket.gateway'

// ── Sentry (optional — only initialised if DSN is set) ────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null
if (process.env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    Sentry = require('@sentry/node')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Sentry.init({
      dsn:              process.env.SENTRY_DSN,
      environment:      env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      release:          process.env.npm_package_version,
    })
    logger.info('Sentry initialized')
  } catch {
    logger.warn('Sentry could not be loaded — run: npm install @sentry/node')
    Sentry = null
  }
}

const app    = express()
const httpServer = http.createServer(app)

// ── Request ID (must be first) ────────────────────────────────────────────────
app.use(requestIdMiddleware)

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy:     false, // handled at Nginx/CDN level
}))
app.use(securityHeaders)

const allowedOrigins = env.NODE_ENV === 'development' ? true : env.FRONTEND_URL
app.use(cors({
  origin:         allowedOrigins,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID', 'X-CSRF-Token'],
}))

// ── Trust proxy (accurate IP behind load balancer) ────────────────────────────
app.set('trust proxy', 1)

// ── Parsing & Compression ─────────────────────────────────────────────────────
app.use(compression())
// Raw body for payment webhook signature verification
app.use('/api/billing/webhooks', express.raw({ type: 'application/json', limit: '1mb' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser(env.COOKIE_SECRET))

// ── Input sanitization ────────────────────────────────────────────────────────
app.use(sanitizeInput)

// ── HTTP access logging (JSON in prod, pretty in dev) ─────────────────────────
app.use(morgan(
  env.NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] :response-time ms'
    : 'dev',
  {
    stream: {
      write: (msg: string) => logger.http(msg.trim()),
    },
    skip: (_req, res) => res.statusCode < 400 && env.NODE_ENV === 'production', // log errors always
  },
))

// ── Prometheus HTTP metrics (on every response) ───────────────────────────────
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.on('finish', () => {
    const route = (req.route?.path as string | undefined) ?? req.path
    recordHttpMetrics(req.method, route, res.statusCode, req.startTime)
  })
  next()
})

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api', defaultLimiter)
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/ai', aiLimiter)
app.use('/api/generate', aiLimiter)

// ── Health Checks ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '1.0.0',
    uptime:    Math.floor(process.uptime()),
  })
})

// Deep health check (checks DB + Redis) — used by K8s readiness probe
app.get('/health/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {}
  let healthy = true

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
    healthy = false
  }

  try {
    const { redis: redisClient } = await import('./config/redis')
    await redisClient.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'error'
    // Redis failure is non-fatal (workers degrade gracefully)
  }

  res.status(healthy ? 200 : 503).json({
    status:    healthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  })
})

// ── Prometheus Metrics ────────────────────────────────────────────────────────
app.use('/metrics', metricsRoutes)

// ── Static files (uploaded avatars, etc.) ─────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/context',      contextExtractRoutes)
app.use('/api/auth',         authRoutes)
app.use('/api/courses',      coursesRoutes)
app.use('/api/documents',    documentsRoutes)
app.use('/api/ai',           aiRoutes)
app.use('/api/users',        usersRoutes)
app.use('/api/institutions', institutionsRoutes)
app.use('/api/academic',     academicRoutes)
app.use('/api/generate',     generateRoutes)
app.use('/api/templates',    templatesRoutes)
app.use('/api/library',      libraryRoutes)
app.use('/api/folders',      foldersRoutes)
app.use('/api/tags',         tagsRoutes)
app.use('/api/comments',     commentsRoutes)
app.use('/api/approvals',    approvalRoutes)
app.use('/api/share',        shareRoutes)
app.use('/api/exports',      exportCenterRoutes)
app.use('/api/marking',      markingRoutes)
app.use('/api/questions',    questionsRoutes)
app.use('/api/assessments',  assessmentsRoutes)
app.use('/api/rubrics',      rubricsRoutes)
app.use('/api/outcomes',     outcomesRoutes)
app.use('/api/moderation',   moderationRoutes)
app.use('/api/analytics',    analyticsRoutes)
app.use('/api/reports',      reportsRoutes)
app.use('/api/insights',     insightsRoutes)
app.use('/api/billing',      billingRoutes)
app.use('/api/student',      studentRoutes)
app.use('/api/enrollments',  enrollmentRoutes)
app.use('/api/submissions',  submissionsRoutes)
app.use('/api/plagiarism',   plagiarismRoutes)
app.use('/api',              collaborationRoutes)

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' })
})

// ── Sentry Error Handler (must be before errorHandler) ───────────────────────
if (Sentry) {
  app.use(Sentry.expressErrorHandler())
}

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler)

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
let shuttingDown = false

function gracefulShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`Received ${signal}. Starting graceful shutdown…`)

  httpServer.close(async () => {
    logger.info('HTTP server closed')
    try {
      await prisma.$disconnect()
      logger.info('Database disconnected')
    } catch (err) {
      logger.error('Error during shutdown', { error: err })
    } finally {
      process.exit(0)
    }
  })

  // Force exit after 30s if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit')
    process.exit(1)
  }, 30_000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

// Swallow Redis ECONNREFUSED rejections in dev — Redis is optional
process.on('unhandledRejection', (reason) => {
  const msg = (reason as { code?: string; message?: string })?.code ?? (reason as Error)?.message ?? ''
  if (msg === 'ECONNREFUSED' || String(reason).includes('ECONNREFUSED')) return
  logger.error('Unhandled rejection', { reason })
})

// ── Start Server ──────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('Database connected')

    await roleService.seedPermissions()
    logger.info('Permissions seeded')

    import('./workers/billing.worker').catch((err: unknown) =>
      logger.warn('Billing workers failed to import', { err: (err as Error).message }),
    )

    import('./workers/collaboration.worker').catch((err: unknown) =>
      logger.warn('Collaboration workers failed to import', { err: (err as Error).message }),
    )

    import('./services/queue/workers/export.worker').catch((err: unknown) =>
      logger.warn('Export worker failed to import', { err: (err as Error).message }),
    )

    const { startReportWorker } = await import('./workers/report.worker')
    startReportWorker()

    createSocketGateway(httpServer)
    logger.info('Socket.IO gateway initialized')

    httpServer.listen(env.PORT, () => {
      logger.info(`LectureCraft API running on http://localhost:${env.PORT}`)
      logger.info(`Environment: ${env.NODE_ENV}`)
    })
  } catch (err) {
    logger.error('Failed to start server', { error: err })
    await prisma.$disconnect()
    process.exit(1)
  }
}

bootstrap()
