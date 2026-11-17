/**
 * Round 3 — Finding 5: Analytics isolation
 *
 * Verifies:
 * - getAssessmentStats returns empty when no scope provided (fail-closed)
 * - listScheduled scopes to createdBy only when institutionId is null
 * - listScheduled uses OR clause when institutionId is set
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

const mockScheduledFindMany = jest.fn()

jest.mock('../config/database', () => ({
  prisma: new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'scheduledReport') {
        return { findMany: mockScheduledFindMany }
      }
      // Any other Prisma method throws — proves fail-closed guard fires before DB
      return new Proxy({}, {
        get: () => () => Promise.reject(new Error(`Unexpected DB call: ${String(prop)}`)),
      })
    },
  }),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { analyticsService } = require('../services/analytics/analytics.service') as typeof import('../services/analytics/analytics.service')
const { reportService }    = require('../services/analytics/report.service') as typeof import('../services/analytics/report.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.clearAllMocks())

// ── getAssessmentStats fail-closed ────────────────────────────────────────────

describe('Finding 5: getAssessmentStats fail-closed', () => {
  it('returns empty structure without hitting the DB when no scope is set', async () => {
    const result = await analyticsService.getAssessmentStats({})
    expect(result.questions.total).toBe(0)
    expect(result.questions.byType).toHaveLength(0)
    expect(result.assessments.total).toBe(0)
    expect(result.rubrics).toBe(0)
    expect(result.outcomes).toBe(0)
  })
})

// ── listScheduled null-institution scoping ────────────────────────────────────

describe('Finding 5: listScheduled null-institution exposure', () => {
  it('queries only by createdBy when institutionId is null (not OR with null)', async () => {
    mockScheduledFindMany.mockResolvedValue([])

    await reportService.listScheduled('user-1', null)

    expect(mockScheduledFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdBy: 'user-1' },
      })
    )
    // Must NOT contain an OR clause with institutionId: null
    const callArg = mockScheduledFindMany.mock.calls[0][0]
    expect(callArg.where).not.toHaveProperty('OR')
  })

  it('uses OR clause when institutionId is set', async () => {
    mockScheduledFindMany.mockResolvedValue([])

    await reportService.listScheduled('user-1', 'inst-1')

    const callArg = mockScheduledFindMany.mock.calls[0][0]
    expect(callArg.where).toHaveProperty('OR')
    expect(callArg.where.OR).toContainEqual({ createdBy: 'user-1' })
    expect(callArg.where.OR).toContainEqual({ institutionId: 'inst-1' })
  })
})
