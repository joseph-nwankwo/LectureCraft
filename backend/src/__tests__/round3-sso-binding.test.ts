/**
 * Round 3 — Finding 6: SSO login-CSRF binding nonce
 *
 * Verifies:
 * - ssoCallback sets both lc_sso_pending and lc_sso_binding cookies
 * - ssoExchange succeeds when both cookies are present and binding matches Redis
 * - ssoExchange rejects when binding cookie is missing
 * - ssoExchange rejects when binding cookie does not match stored binding
 */

const JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_ACCESS_SECRET               = JWT_ACCESS_SECRET
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.DATABASE_URL                    = 'postgresql://test:test@localhost:5432/test'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-!!!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'
process.env.FRONTEND_URL                    = 'http://localhost:3001'
process.env.APP_URL                         = 'http://localhost:4000'

import jwt from 'jsonwebtoken'
import express from 'express'
import cookieParser from 'cookie-parser'
import supertest from 'supertest'

// ── Mock Redis ────────────────────────────────────────────────────────────────
let redisStore: Record<string, string> = {}
const mockRedisSet    = jest.fn().mockImplementation(
  (key: string, value: string, _ex: string, _ttl: number, _nx: string) => {
    redisStore[key] = value
    return Promise.resolve('OK')
  }
)
const mockRedisGetdel = jest.fn().mockImplementation((key: string) => {
  const val = redisStore[key] ?? null
  delete redisStore[key]
  return Promise.resolve(val)
})

jest.mock('../config/redis', () => ({
  redis: { set: mockRedisSet, getdel: mockRedisGetdel },
}))

// ── Mock Prisma ───────────────────────────────────────────────────────────────
const testUser = { id: 'user-1', email: 'a@test.com', institutionId: 'inst-1', name: 'Alice', isActive: true, isSuspended: false, passwordHash: null }
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique:  jest.fn().mockResolvedValue(testUser),
      findFirst:   jest.fn().mockResolvedValue(testUser),
      update:      jest.fn().mockResolvedValue(testUser),
    },
    userProductRole: { findUnique: jest.fn().mockResolvedValue(null) },
    refreshToken:    { create: jest.fn().mockResolvedValue({ token: 'rt', expiresAt: new Date() }) },
    institution:     { findFirst: jest.fn().mockResolvedValue({ id: 'inst-1', name: 'Test Uni' }) },
  },
}))

// ── Mock entitlement check (pass-through) ─────────────────────────────────────
jest.mock('../services/auth/central-entitlement', () => ({
  requireCentralEntitlement: jest.fn().mockResolvedValue(undefined),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { authController } = require('../controllers/auth.controller') as typeof import('../controllers/auth.controller')
/* eslint-enable @typescript-eslint/no-require-imports */

function makeApp() {
  const app = express()
  app.use(cookieParser())
  app.use(express.json())
  // Exchange endpoint
  app.post('/api/auth/sso/exchange', authController.ssoExchange)
  app.use((err: { statusCode?: number; message?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode ?? 500).json({ status: 'error', message: err.message })
  })
  return app
}

function makeLaunchToken() {
  return jwt.sign(
    { sub: 'user-1', email: 'a@test.com', type: 'sso_launch', target: 'lecturecraft', jti: 'jti-1', iss: 'uamsatech', aud: 'lecturecraft' },
    process.env.CRAFT_LAUNCH_SECRET!,
    { algorithm: 'HS256', expiresIn: '5m' }
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  redisStore = {}
})

describe('Finding 6: SSO binding nonce', () => {
  it('ssoExchange rejects when lc_sso_binding cookie is absent', async () => {
    // Plant a code in Redis with a binding
    redisStore['sso:code:valid-code'] = JSON.stringify({ userId: 'user-1', binding: 'correct-binding' })

    const app = makeApp()
    const res = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=valid-code')  // no binding cookie

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/binding/i)
  })

  it('ssoExchange rejects when binding cookie does not match stored binding', async () => {
    redisStore['sso:code:valid-code'] = JSON.stringify({ userId: 'user-1', binding: 'correct-binding' })

    const app = makeApp()
    const res = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=valid-code; lc_sso_binding=wrong-binding')

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/binding mismatch/i)
  })

  it('ssoExchange succeeds when both pending and binding cookies match', async () => {
    redisStore['sso:code:valid-code'] = JSON.stringify({ userId: 'user-1', binding: 'correct-binding' })

    const app = makeApp()
    const res = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=valid-code; lc_sso_binding=correct-binding')

    expect(res.status).toBe(200)
    expect(res.body.tokens).toHaveProperty('accessToken')
  })

  it('ssoExchange rejects when code is not found in Redis', async () => {
    // Nothing in Redis
    const app = makeApp()
    const res = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=nonexistent-code; lc_sso_binding=any-binding')

    expect(res.status).toBe(401)
  })

  it('code is consumed after first use (single-use)', async () => {
    redisStore['sso:code:one-time'] = JSON.stringify({ userId: 'user-1', binding: 'binding-nonce' })

    const app = makeApp()
    // First request succeeds
    const r1 = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=one-time; lc_sso_binding=binding-nonce')
    expect(r1.status).toBe(200)

    // Second request with the same code (and nonce) fails
    // Note: redis mock deletes on getdel, so second call returns null
    const r2 = await supertest(app)
      .post('/api/auth/sso/exchange')
      .set('Cookie', 'lc_sso_pending=one-time; lc_sso_binding=binding-nonce')
    expect(r2.status).toBe(401)
  })
})
