/**
 * CVE-LS-003 Regression Tests — SSO Authorization Code Exchange
 *
 * Verifies that:
 * - POST /api/auth/sso/exchange accepts a valid code delivered via HttpOnly cookie
 * - Authorization code is NEVER exposed in the redirect URL (no ?code= in URL)
 * - Code is bound to the browser session (cookie), not to a URL parameter
 * - Refresh token is set as an HttpOnly cookie, NOT in the response body
 * - Codes are single-use (replay rejected)
 * - Expired/missing codes are rejected
 * - Redis failures fail closed
 * - Central entitlement is verified before issuing tokens
 */

import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import supertest from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'

// ── Product constants ─────────────────────────────────────────────────────────
const PRODUCT      = 'lecturesuite'
const FRONTEND_URL = 'http://localhost:3001'

// ── Environment setup ─────────────────────────────────────────────────────────
const CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'
const JWT_ACCESS_SECRET   = 'test-jwt-access-secret-min-32-chars-long!!'
const COOKIE_SECRET       = 'test-cookie-secret-min-32-chars-long!!!!!!!'

process.env.DATABASE_URL        = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET   = JWT_ACCESS_SECRET
process.env.JWT_REFRESH_SECRET  = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET = CRAFT_LAUNCH_SECRET
process.env.COOKIE_SECRET       = COOKIE_SECRET
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL        = FRONTEND_URL

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
  prisma: {
    user:            { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    userProductRole: { findUnique: jest.fn(), upsert: jest.fn() },
    refreshToken:    { create: jest.fn() },
  },
}))

jest.mock('../config/redis', () => ({ redis: { set: jest.fn(), getdel: jest.fn() } }))

jest.mock('../services/auth/jwt.service', () => ({
  signAccessToken:    jest.fn(),
  createRefreshToken: jest.fn(),
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
const { prisma } = require('../config/database') as {
  prisma: {
    user:            { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
    userProductRole: { findUnique: jest.Mock; upsert: jest.Mock }
    refreshToken:    { create: jest.Mock }
  }
}
const { redis } = require('../config/redis') as { redis: { set: jest.Mock; getdel: jest.Mock } }
const jwtService = require('../services/auth/jwt.service') as {
  signAccessToken: jest.Mock
  createRefreshToken: jest.Mock
}
const { requireCentralEntitlement } = require('../services/auth/central-entitlement') as {
  requireCentralEntitlement: jest.Mock
}
const { authController } = require('../controllers/auth.controller')
/* eslint-enable @typescript-eslint/no-require-imports */

const mockUser = { id: 'user-1', email: 'person@uamsatech.com', institutionId: null, role: 'LECTURER' }

// ── Redis store ───────────────────────────────────────────────────────────────

type RedisStore = Map<string, string>
let redisStore: RedisStore

function setupRedisStore() {
  redisStore = new Map()

  redis.set.mockImplementation((key: string, value: string, _ex: string, _ttl: number, nx: string) => {
    if (nx !== 'NX') return Promise.resolve('OK')
    if (redisStore.has(key)) return Promise.resolve(null)
    redisStore.set(key, value)
    return Promise.resolve('OK')
  })

  redis.getdel.mockImplementation((key: string) => {
    const val = redisStore.get(key) ?? null
    redisStore.delete(key)
    return Promise.resolve(val)
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildLaunchToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    {
      sub: 'portal-user-id', email: mockUser.email,
      type: 'product_launch', target: PRODUCT,
      iss: 'uamsatech', aud: PRODUCT,
      jti: randomUUID(), ...overrides,
    },
    CRAFT_LAUNCH_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  )
}

function buildApp(): express.Application {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.get('/api/auth/sso',          authController.ssoCallback)
  app.post('/api/auth/sso/exchange', authController.ssoExchange)
  app.use((err: { statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode ?? 500).json({ status: 'error', message: err.message })
  })
  return app
}

// Creates a supertest Agent bound to a single app instance so the
// lc_sso_pending cookie set by ssoCallback is forwarded to ssoExchange.
async function runExchange(app = buildApp()): Promise<{
  ssoRes:  supertest.Response
  exRes:   supertest.Response
}> {
  const agent  = supertest.agent(app)
  const ssoRes = await agent.get(`/api/auth/sso?token=${buildLaunchToken()}`)
  const exRes  = await agent.post('/api/auth/sso/exchange')
  return { ssoRes, exRes }
}

const request = () => supertest(buildApp())

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  setupRedisStore()
  prisma.user.findUnique.mockResolvedValue(mockUser)
  prisma.user.create.mockResolvedValue(mockUser)
  prisma.user.update.mockResolvedValue(mockUser)
  prisma.userProductRole.upsert.mockResolvedValue({ id: 'role-1', userId: mockUser.id, product: PRODUCT, role: 'LECTURER' })
  prisma.userProductRole.findUnique.mockResolvedValue({ id: 'role-1', userId: mockUser.id, product: PRODUCT, role: 'LECTURER' })
  prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1', token: 'hashed-rt', userId: mockUser.id })
  jwtService.signAccessToken.mockReturnValue('mock-access-token')
  jwtService.createRefreshToken.mockResolvedValue('mock-refresh-token')
  requireCentralEntitlement.mockResolvedValue(new Date(Date.now() + 30 * 86400000))
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CVE-LS-003: SSO redirect must not expose code in URL', () => {
  it('redirects to /auth/sso with no code or tokens in the URL — code bound to HttpOnly cookie', async () => {
    const res = await request().get(`/api/auth/sso?token=${buildLaunchToken()}`)
    expect(res.status).toBe(302)
    // Code is in an HttpOnly cookie, never the URL
    expect(res.headers.location).toBe(`${FRONTEND_URL}/auth/sso`)
    expect(res.headers.location).not.toContain('code=')
    expect(res.headers.location).not.toContain('at=')
    expect(res.headers.location).not.toContain('rt=')
    // lc_sso_pending must be set as an HttpOnly cookie
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    expect(cookies.some(c => c.startsWith('lc_sso_pending='))).toBe(true)
    expect(cookies.some(c => c.toLowerCase().includes('httponly'))).toBe(true)
  })

  it('the authorization code stored in the cookie is 64 hex characters (256 bits of entropy)', async () => {
    const res = await request().get(`/api/auth/sso?token=${buildLaunchToken()}`)
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    const pending = cookies.find(c => c.startsWith('lc_sso_pending='))
    const code = pending?.split(';')[0].replace('lc_sso_pending=', '') ?? ''
    expect(code).toMatch(/^[0-9a-f]{64}$/)
  })

  it('stores the code in Redis with ≤60 s TTL under sso:code: prefix', async () => {
    await request().get(`/api/auth/sso?token=${buildLaunchToken()}`)
    const codeCall = redis.set.mock.calls.find(([k]: [string]) => k.startsWith('sso:code:'))
    expect(codeCall).toBeDefined()
    expect(codeCall?.[3]).toBeLessThanOrEqual(60)
  })
})

describe('CVE-LS-003: POST /api/auth/sso/exchange', () => {
  it('exchanges a valid cookie-bound code for an access token and sets the RT in an HttpOnly cookie', async () => {
    const { exRes } = await runExchange()

    expect(exRes.status).toBe(200)
    expect(exRes.body.tokens?.accessToken).toBe('mock-access-token')
    // Refresh token must be in HttpOnly cookie — NOT in response body
    expect(exRes.body.tokens?.refreshToken).toBeUndefined()
    const setCookie = ([] as string[]).concat(exRes.headers['set-cookie'] ?? [])
    expect(setCookie.some(c => c.includes('lc_refresh='))).toBe(true)
    expect(setCookie.some(c => c.toLowerCase().includes('httponly'))).toBe(true)
  })

  it('verifies central entitlement before issuing tokens', async () => {
    const { exRes } = await runExchange()
    expect(exRes.status).toBe(200)
    expect(requireCentralEntitlement).toHaveBeenCalledWith(PRODUCT, mockUser.email)
  })

  it('fails with 403 when central entitlement is denied', async () => {
    requireCentralEntitlement.mockRejectedValueOnce(
      Object.assign(new Error('Access to this product is managed through your UAMSA Tech portal account.'), { statusCode: 403 })
    )
    const { exRes } = await runExchange()
    expect(exRes.status).toBe(403)
    expect(jwtService.signAccessToken).not.toHaveBeenCalled()
  })

  it('rejects a second exchange attempt on the same session (single-use cookie + code)', async () => {
    const app   = buildApp()
    const agent = supertest.agent(app)
    await agent.get(`/api/auth/sso?token=${buildLaunchToken()}`)
    await agent.post('/api/auth/sso/exchange')       // first exchange — clears cookie
    const second = await agent.post('/api/auth/sso/exchange')  // no cookie remains

    // Cookie was cleared; missing cookie returns 400
    expect(second.status).toBe(400)
    expect(jwtService.signAccessToken).toHaveBeenCalledTimes(1)
  })

  it('rejects an entirely fabricated code that was never stored in Redis', async () => {
    const res = await request()
      .post('/api/auth/sso/exchange')
      .set('Cookie', `lc_sso_pending=${'a'.repeat(64)}`)
    expect(res.status).toBe(401)
    expect(jwtService.signAccessToken).not.toHaveBeenCalled()
  })

  it('rejects a request with no pending cookie (no code at all)', async () => {
    const res = await request().post('/api/auth/sso/exchange')
    expect(res.status).toBe(400)
  })

  it('fails closed when Redis getdel throws', async () => {
    redis.getdel.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    const res = await request()
      .post('/api/auth/sso/exchange')
      .set('Cookie', `lc_sso_pending=${'a'.repeat(64)}`)
    expect(res.status).toBe(503)
    expect(res.body.message).not.toMatch(/ECONNREFUSED|6379/)
    expect(jwtService.signAccessToken).not.toHaveBeenCalled()
  })

  it('issues a signAccessToken call with the correct user payload on exchange', async () => {
    const { exRes } = await runExchange()
    expect(exRes.status).toBe(200)

    expect(jwtService.signAccessToken).toHaveBeenCalledTimes(1)
    const payload = jwtService.signAccessToken.mock.calls[0][0]
    expect(payload.userId).toBe(mockUser.id)
    expect(payload.email).toBe(mockUser.email)
  })
})
