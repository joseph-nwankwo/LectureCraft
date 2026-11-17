/**
 * Finding D — Analytics service fail-closed unit tests
 *
 * Verifies that getAIUsageStats, getDocumentStats, and getBloomCoverage return
 * empty / zero results instead of issuing unscoped global Prisma queries when
 * neither userId nor institutionId is provided.
 *
 * This file intentionally does NOT mock the analytics service so it can test
 * the real guard clauses. All Prisma calls must be unreachable when no scope is
 * set, so we let them throw to prove the early return fires before any DB work.
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

// Provide a Prisma mock whose methods THROW if called — this proves the
// fail-closed guard returns before any DB query executes.
jest.mock('../config/database', () => ({
  prisma: new Proxy({}, {
    get: (_target, prop) => new Proxy({}, {
      get: () => () => Promise.reject(new Error(`Unexpected DB call: ${String(prop)}`)),
    }),
  }),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { analyticsService } = require('../services/analytics/analytics.service') as {
  analyticsService: {
    getAIUsageStats:  (opts: Record<string, unknown>) => Promise<unknown>
    getDocumentStats: (opts: Record<string, unknown>) => Promise<unknown>
    getBloomCoverage: (opts: Record<string, unknown>) => Promise<unknown>
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

describe('Finding D: analytics service fail-closed (no DB query when no scope)', () => {
  it('getAIUsageStats returns empty aggregate when neither userId nor institutionId is set', async () => {
    const result = await analyticsService.getAIUsageStats({}) as {
      aggregate: { totalGenerations: number; tokensInput: number; tokensOutput: number; totalTokens: number; costUsd: number; avgCostPerGeneration: number }
      byProvider: unknown[]
      byModule: unknown[]
      timeSeries: unknown[]
      costSeries: unknown[]
    }
    expect(result.aggregate.totalGenerations).toBe(0)
    expect(result.aggregate.costUsd).toBe(0)
    expect(result.byProvider).toHaveLength(0)
    expect(result.timeSeries).toHaveLength(0)
    expect(result.costSeries).toHaveLength(0)
  })

  it('getDocumentStats returns zeros when neither userId nor institutionId is set', async () => {
    const result = await analyticsService.getDocumentStats({}) as {
      total: number
      createdThisPeriod: number
      byType: unknown[]
      byStatus: unknown[]
      approvalStats: unknown[]
      timeSeries: unknown[]
    }
    expect(result.total).toBe(0)
    expect(result.createdThisPeriod).toBe(0)
    expect(result.byType).toHaveLength(0)
    expect(result.timeSeries).toHaveLength(0)
  })

  it('getBloomCoverage returns empty distribution when neither userId nor institutionId nor courseId is set', async () => {
    const result = await analyticsService.getBloomCoverage({}) as {
      distribution: unknown[]
      total: number
      missingLevels: string[]
      coverageScore: number
    }
    expect(result.distribution).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.coverageScore).toBe(0)
    expect(result.missingLevels).toContain('REMEMBER')
    expect(result.missingLevels).toContain('CREATE')
  })
})
