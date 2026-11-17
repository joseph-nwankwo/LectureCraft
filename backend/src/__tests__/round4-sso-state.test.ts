/**
 * Round 4 — Finding 5: SSO genuine browser-bound state (login-CSRF prevention)
 *
 * Verifies:
 * - GET /api/auth/sso/initiate sets lc_sso_state HttpOnly SameSite=Lax cookie
 * - Initiate stores state in Redis with ≤600 s TTL
 * - Initiate redirects to PORTAL_LAUNCH_URL?state=<state>
 * - ssoCallback rejects when PORTAL_LAUNCH_URL is configured but state param is missing
 * - ssoCallback rejects when state param does not match lc_sso_state cookie
 * - ssoCallback rejects when state is not in Redis (never issued / already used)
 * - ssoCallback accepts and clears state when everything matches (single-use)
 * - Attack scenario: attacker cannot redirect victim into their own session
 *   because the state in the URL won't match the victim's lc_sso_state cookie
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'
// Enable state-based flow
process.env.PORTAL_LAUNCH_URL  = 'https://portal.test/api/portal/launch/lecturesuite'

import jwt from 'jsonwebtoken'
import express from 'express'
import cookieParser from 'cookie-parser'
import supertest from 'supertest'
import { randomUUID } from 'crypto'

const CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET = CRAFT_LAUNCH_SECRET

// ── Redis mock ────────────────────────────────────────────────────────────────
let redisStore: Record<string, string> = {}
const mockRedisSet    = jest.fn()
const mockRedisGetdel = jest.fn()

jest.mock('../config/redis', () => ({
  redis: { set: mockRedisSet, getdel: mockRedisGetdel },
}))

// ── Prisma mock ───────────────────────────────────────────────────────────────
const testUser = { id: 'user-1', email: 'test@test.com', institutionId: null, role: 'LECTURER' }
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue(testUser),
      create:     jest.fn().mockResolvedValue(testUser),
      update:     jest.fn().mockResolvedValue(testUser),
    },
    userProductRole: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    refreshToken:    { create: jest.fn().mockResolvedValue({ token: 'rt', expiresAt: new Date() }) },
  },
}))

jest.mock('../services/auth/jwt.service', () => ({
  signAccessToken:    jest.fn().mockReturnValue('mock-access-token'),
  createRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
}))

jest.mock('../services/storage/storage.service', () => ({
  isR2Configured:          jest.fn().mockReturnValue(false),
  validateImageMagicBytes: jest.fn(),
  mimeToExt:               jest.fn(),
  uploadToR2:              jest.fn(),
  deleteFromR2:            jest.fn(),
}))

jest.mock('../services/auth/central-entitlement', () => ({
  requireCentralEntitlement: jest.fn().mockResolvedValue(new Date(Date.now() + 30 * 86400000)),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { authController } = require('../controllers/auth.controller') as typeof import('../controllers/auth.controller')
/* eslint-enable @typescript-eslint/no-require-imports */

function buildApp() {
  const app = express()
  app.use(cookieParser())
  app.use(express.json())
  app.get('/api/auth/sso/initiate', authController.ssoInitiate)
  app.get('/api/auth/sso',          authController.ssoCallback)
  app.post('/api/auth/sso/exchange', authController.ssoExchange)
  app.use((err: { statusCode?: number; message?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.statusCode ?? 500).json({ status: 'error', message: err.message })
  })
  return app
}

function buildLaunchToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    { sub: 'portal-user-id', email: testUser.email, type: 'product_launch', target: 'lecturesuite',
      iss: 'uamsatech', aud: 'lecturesuite', jti: randomUUID(), ...overrides },
    CRAFT_LAUNCH_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  )
}

function setupRedis() {
  redisStore = {}
  mockRedisSet.mockReset()
  mockRedisGetdel.mockReset()
  mockRedisSet.mockImplementation((key: string, value: string, _ex: string, _ttl: number, nx: string) => {
    if (nx !== 'NX') return Promise.resolve('OK')
    if (redisStore[key] !== undefined) return Promise.resolve(null)
    redisStore[key] = value
    return Promise.resolve('OK')
  })
  mockRedisGetdel.mockImplementation((key: string) => {
    const val = redisStore[key] ?? null
    delete redisStore[key]
    return Promise.resolve(val)
  })
}

beforeEach(setupRedis)

// ── Initiate endpoint ─────────────────────────────────────────────────────────

describe('Finding 5: GET /api/auth/sso/initiate', () => {
  it('redirects to PORTAL_LAUNCH_URL with ?state=', async () => {
    const res = await supertest(buildApp()).get('/api/auth/sso/initiate')
    expect(res.status).toBe(302)
    const loc = res.headers.location ?? ''
    expect(loc).toMatch(/^https:\/\/portal\.test\/api\/portal\/launch\/lecturesuite\?state=/)
  })

  it('sets lc_sso_state as an HttpOnly SameSite=Lax cookie', async () => {
    const res = await supertest(buildApp()).get('/api/auth/sso/initiate')
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    const stateCookie = cookies.find((c) => c.startsWith('lc_sso_state='))
    expect(stateCookie).toBeDefined()
    expect(stateCookie?.toLowerCase()).toContain('httponly')
    expect(stateCookie?.toLowerCase()).toContain('samesite=lax')
  })

  it('stores state in Redis with TTL ≤ 600 s', async () => {
    await supertest(buildApp()).get('/api/auth/sso/initiate')
    const setCall = mockRedisSet.mock.calls.find(([k]: [string]) => k.startsWith('sso:state:'))
    expect(setCall).toBeDefined()
    expect(setCall?.[3]).toBeLessThanOrEqual(600)
  })

  it('state in redirect URL matches the cookie value', async () => {
    const res = await supertest(buildApp()).get('/api/auth/sso/initiate')
    const loc = res.headers.location ?? ''
    const urlState = new URL(loc).searchParams.get('state') ?? ''
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    const cookieState = cookies.find((c) => c.startsWith('lc_sso_state='))?.split(';')[0].replace('lc_sso_state=', '') ?? ''
    expect(urlState).toBe(cookieState)
    expect(urlState).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ── ssoCallback state verification ───────────────────────────────────────────

describe('Finding 5: ssoCallback state verification (PORTAL_LAUNCH_URL configured)', () => {
  it('rejects when state param is missing (no cookie, no param)', async () => {
    const res = await supertest(buildApp()).get(`/api/auth/sso?token=${buildLaunchToken()}`)
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/state/i)
  })

  it('rejects when state cookie is missing even if state param is present', async () => {
    const res = await supertest(buildApp()).get(`/api/auth/sso?token=${buildLaunchToken()}&state=abc123`)
    expect(res.status).toBe(401)
  })

  it('rejects when state param does not match the cookie', async () => {
    // Plant a valid state in Redis
    redisStore['sso:state:cookie-state'] = '1'
    const res = await supertest(buildApp())
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=different-state`)
      .set('Cookie', 'lc_sso_state=cookie-state')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/mismatch/i)
  })

  it('rejects when state is not in Redis (never issued / already consumed)', async () => {
    // State matches cookie but is NOT in Redis
    const res = await supertest(buildApp())
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=orphaned-state`)
      .set('Cookie', 'lc_sso_state=orphaned-state')
    expect(res.status).toBe(401)
  })

  it('accepts and proceeds when state param, cookie, and Redis entry all match', async () => {
    redisStore['sso:state:valid-state'] = '1'
    const res = await supertest(buildApp())
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=valid-state`)
      .set('Cookie', 'lc_sso_state=valid-state')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://localhost:3001/auth/sso')
    // State must be single-use: removed from Redis
    expect(redisStore['sso:state:valid-state']).toBeUndefined()
  })

  it('state is single-use: second callback with same state is rejected', async () => {
    redisStore['sso:state:one-time'] = '1'
    const app = buildApp()
    const r1 = await supertest(app)
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=one-time`)
      .set('Cookie', 'lc_sso_state=one-time')
    expect(r1.status).toBe(302)

    // Second attempt — state already consumed
    const r2 = await supertest(app)
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=one-time`)
      .set('Cookie', 'lc_sso_state=one-time')
    expect(r2.status).toBe(401)
  })
})

// ── Attack scenario ───────────────────────────────────────────────────────────

describe('Finding 5: login-CSRF attack prevention', () => {
  it("attacker's state does not match victim's cookie, so the callback is rejected", async () => {
    // Attacker has initiated their own login flow with 'attacker-state'
    // Victim has 'victim-state' in their cookie from their own initiation
    redisStore['sso:state:attacker-state'] = '1'

    // Attacker tricks victim into visiting /api/auth/sso?token=<attacker_JWT>&state=attacker-state
    // but victim's browser sends their own lc_sso_state=victim-state cookie
    const res = await supertest(buildApp())
      .get(`/api/auth/sso?token=${buildLaunchToken()}&state=attacker-state`)
      .set('Cookie', 'lc_sso_state=victim-state')  // victim's cookie

    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/mismatch/i)
  })
})
