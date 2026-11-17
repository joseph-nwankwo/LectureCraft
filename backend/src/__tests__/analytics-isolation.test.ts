/**
 * Analytics Isolation Regression Tests (Finding D)
 *
 * Covers:
 * - IDOR on GET /api/analytics/lecturer/:userId (non-admin may not view other users)
 * - Cross-institution IDOR (institution-scoped admin may not view another institution's users)
 * - trackEvent identity override prevention (body userId/institutionId ignored; JWT is authoritative)
 * - approvalStats scoping: non-admin sees only own docs; admin sees institution-wide
 * - Fail-closed behavior: getAIUsageStats, getDocumentStats, getBloomCoverage return empty
 *   instead of issuing unscoped global queries when neither userId nor institutionId is set
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import supertest from 'supertest'
import express from 'express'

// ── Environment setup ─────────────────────────────────────────────────────────
process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
  },
}))

jest.mock('../services/analytics/analytics.service', () => ({
  analyticsService: {
    getLecturerDashboard:         jest.fn().mockResolvedValue({}),
    getAIUsageStats:              jest.fn().mockResolvedValue({}),
    getDocumentStats:             jest.fn().mockResolvedValue({}),
    getBloomCoverage:             jest.fn().mockResolvedValue({}),
    getApprovalStats:             jest.fn().mockResolvedValue({}),
    trackEvent:                   jest.fn().mockResolvedValue(undefined),
    getInstitutionDashboard:      jest.fn().mockResolvedValue({}),
    getDepartmentDashboard:       jest.fn().mockResolvedValue({}),
    getFacultyDashboard:          jest.fn().mockResolvedValue({}),
    getAssessmentStats:           jest.fn().mockResolvedValue({}),
    getProductivityLeaderboard:   jest.fn().mockResolvedValue({}),
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('../config/database') as {
  prisma: { user: { findFirst: jest.Mock } }
}
const { analyticsService } = require('../services/analytics/analytics.service') as {
  analyticsService: {
    getLecturerDashboard:       jest.Mock
    getAIUsageStats:            jest.Mock
    getDocumentStats:           jest.Mock
    getBloomCoverage:           jest.Mock
    getApprovalStats:           jest.Mock
    trackEvent:                 jest.Mock
  }
}
const { analyticsController } = require('../controllers/analytics.controller')
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Helpers ───────────────────────────────────────────────────────────────────

interface FakeUser {
  userId: string
  email: string
  role: string
  institutionId: string | null
  roleSlug: string
}

function auth(user: Partial<FakeUser> = {}): RequestHandler {
  const defaults: FakeUser = {
    userId: 'user-1', email: 'test@test.com', role: 'LECTURER',
    institutionId: null, roleSlug: 'lecturer',
  }
  return (req: Request, _res: Response, next: NextFunction) => {
    req.user = { ...defaults, ...user } as never
    next()
  }
}

function buildApp(userOverrides: Partial<FakeUser> = {}): express.Application {
  const app = express()
  app.use(express.json())
  app.use(auth(userOverrides))
  app.get('/api/analytics/lecturer/:userId', analyticsController.lecturerDashboard)
  app.get('/api/analytics/ai-usage',         analyticsController.aiUsage)
  app.get('/api/analytics/documents',        analyticsController.documentStats)
  app.get('/api/analytics/bloom',            analyticsController.bloomCoverage)
  app.get('/api/analytics/approvals',        analyticsController.approvalStats)
  app.post('/api/analytics/events',          analyticsController.trackEvent)
  app.use((err: { statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode ?? 500).json({ status: 'error', message: err.message })
  })
  return app
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  analyticsService.getLecturerDashboard.mockResolvedValue({})
  analyticsService.getAIUsageStats.mockResolvedValue({})
  analyticsService.getDocumentStats.mockResolvedValue({})
  analyticsService.getBloomCoverage.mockResolvedValue({})
  analyticsService.getApprovalStats.mockResolvedValue({})
  analyticsService.trackEvent.mockResolvedValue(undefined)
})

// ── IDOR: lecturerDashboard ────────────────────────────────────────────────────

describe('Finding D: IDOR on GET /api/analytics/lecturer/:userId', () => {
  it('allows a lecturer to view their own dashboard', async () => {
    const res = await supertest(buildApp({ userId: 'user-1', role: 'LECTURER' }))
      .get('/api/analytics/lecturer/user-1')
    expect(res.status).toBe(200)
    expect(analyticsService.getLecturerDashboard).toHaveBeenCalledWith('user-1', undefined)
  })

  it('blocks a lecturer from viewing another user\'s dashboard (IDOR)', async () => {
    const res = await supertest(buildApp({ userId: 'user-1', role: 'LECTURER' }))
      .get('/api/analytics/lecturer/victim-user-99')
    expect(res.status).toBe(403)
    expect(analyticsService.getLecturerDashboard).not.toHaveBeenCalled()
  })

  it('allows UNIVERSITY_ADMIN to view a lecturer in their institution', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'target-user', institutionId: 'inst-1' })
    const res = await supertest(buildApp({
      userId: 'admin-1', role: 'UNIVERSITY_ADMIN', institutionId: 'inst-1',
    })).get('/api/analytics/lecturer/target-user')
    expect(res.status).toBe(200)
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'target-user', institutionId: 'inst-1' } })
    )
  })

  it('blocks UNIVERSITY_ADMIN from viewing a lecturer in a different institution (cross-institution IDOR)', async () => {
    // Target user is NOT in the admin's institution — findFirst returns null
    prisma.user.findFirst.mockResolvedValue(null)
    const res = await supertest(buildApp({
      userId: 'admin-1', role: 'UNIVERSITY_ADMIN', institutionId: 'inst-1',
    })).get('/api/analytics/lecturer/target-in-inst-2')
    expect(res.status).toBe(403)
    expect(analyticsService.getLecturerDashboard).not.toHaveBeenCalled()
  })
})

// ── trackEvent identity override prevention ────────────────────────────────────

describe('Finding D: trackEvent ignores body userId/institutionId (uses JWT)', () => {
  it('calls trackEvent with userId from JWT, not from body', async () => {
    const res = await supertest(buildApp({ userId: 'jwt-user', institutionId: 'jwt-inst' }))
      .post('/api/analytics/events')
      .send({
        eventType:    'DOCUMENT_CREATED',
        entityType:   'document',
        entityId:     'doc-1',
        // Attacker tries to log the event under a different user
        userId:        'attacker-forged-id',
        institutionId: 'attacker-forged-inst',
      })
    expect(res.status).toBe(201)
    const call = analyticsService.trackEvent.mock.calls[0][0]
    expect(call.userId).toBe('jwt-user')
    expect(call.institutionId).toBe('jwt-inst')
    // Forged values must not leak into the call
    expect(call.userId).not.toBe('attacker-forged-id')
    expect(call.institutionId).not.toBe('attacker-forged-inst')
  })

  it('eventType and entityId from body are forwarded (non-identity fields)', async () => {
    await supertest(buildApp({ userId: 'u1' }))
      .post('/api/analytics/events')
      .send({ eventType: 'DOCUMENT_VIEWED', entityType: 'document', entityId: 'doc-42' })
    const call = analyticsService.trackEvent.mock.calls[0][0]
    expect(call.eventType).toBe('DOCUMENT_VIEWED')
    expect(call.entityId).toBe('doc-42')
  })
})

// ── approvalStats scoping ─────────────────────────────────────────────────────

describe('Finding D: approvalStats scoping', () => {
  it('scopes by userId for non-admin callers', async () => {
    await supertest(buildApp({ userId: 'user-1', role: 'LECTURER', institutionId: null }))
      .get('/api/analytics/approvals')
    const call = analyticsService.getApprovalStats.mock.calls[0][0]
    expect(call.userId).toBe('user-1')
    expect(call.institutionId).toBeUndefined()
  })

  it('scopes by institutionId for admin callers', async () => {
    await supertest(buildApp({ userId: 'admin-1', role: 'UNIVERSITY_ADMIN', institutionId: 'inst-1' }))
      .get('/api/analytics/approvals')
    const call = analyticsService.getApprovalStats.mock.calls[0][0]
    expect(call.institutionId).toBe('inst-1')
    expect(call.userId).toBeUndefined()
  })
})

// Note: fail-closed behavior of the analytics service (getAIUsageStats,
// getDocumentStats, getBloomCoverage returning empty when no scope is provided)
// is tested in analytics-service-failclosed.test.ts, which imports the real
// service without overriding it at the module boundary.
