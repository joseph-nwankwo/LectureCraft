/**
 * CVE-LS-004 Regression Tests — Cross-Institution Scheduled Report Isolation
 *
 * Verifies that:
 * - getApprovalStats never issues an unscoped (global) query
 * - Reports scoped to institutionId only return that institution's data
 * - Reports scoped to userId only return that user's documents' data
 * - Institution A cannot see Institution B's approval statistics
 * - null institutionId + null userId returns empty stats (safe fallback)
 */

// ── Environment setup ─────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET               = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGroupBy = jest.fn()
const mockCount   = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    approvalWorkflow: {
      groupBy: mockGroupBy,
      count:   mockCount,
    },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { analyticsService } = require('../services/analytics/analytics.service') as
  typeof import('../services/analytics/analytics.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  mockGroupBy.mockResolvedValue([])
  mockCount.mockResolvedValue(0)
})

afterEach(() => { jest.clearAllMocks() })

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CVE-LS-004: getApprovalStats — never issues unscoped query', () => {
  it('returns empty stats when neither institutionId nor userId provided (safe fallback)', async () => {
    const result = await analyticsService.getApprovalStats({})
    expect(result).toEqual({ total: 0, approvalRate: 0, thisperiod: 0, byStatus: [], byStage: [] })
    // The DB must NOT be queried with an empty where clause
    expect(mockGroupBy).not.toHaveBeenCalled()
    expect(mockCount).not.toHaveBeenCalled()
  })

  it('scopes to institutionId when provided — does not include other institutions', async () => {
    await analyticsService.getApprovalStats({ institutionId: 'inst-A' })
    const calls = mockGroupBy.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([arg]: [{ where: Record<string, unknown> }]) => {
      expect(arg.where.document).toEqual({ institutionId: 'inst-A' })
    })
  })

  it('Institution A query does NOT include Institution B scope', async () => {
    await analyticsService.getApprovalStats({ institutionId: 'inst-A' })
    const allWhere = mockGroupBy.mock.calls.map(([a]: [{ where: Record<string, unknown> }]) => a.where)
    allWhere.forEach((w) => {
      expect(JSON.stringify(w)).not.toContain('inst-B')
    })
  })

  it('scopes to userId when no institutionId — does not query globally', async () => {
    await analyticsService.getApprovalStats({ userId: 'user-123' })
    const calls = mockGroupBy.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([arg]: [{ where: Record<string, unknown> }]) => {
      expect(arg.where.document).toEqual({ userId: 'user-123' })
    })
  })

  it('cross-institution isolation: User from inst-A with null institutionId cannot see inst-B data', async () => {
    // A scheduled report created by a user with no institution (institutionId = null)
    // must only scope to that user's own documents, never globally.
    await analyticsService.getApprovalStats({ institutionId: undefined, userId: 'user-no-inst' })
    const calls = mockGroupBy.mock.calls
    expect(calls.length).toBeGreaterThan(0)
    calls.forEach(([arg]: [{ where: Record<string, unknown> }]) => {
      // Must have a document scope
      expect(arg.where.document).toBeDefined()
      // Must NOT be scoped to an institution
      expect((arg.where.document as Record<string, unknown>).institutionId).toBeUndefined()
      // Must be scoped to the user
      expect((arg.where.document as Record<string, unknown>).userId).toBe('user-no-inst')
    })
  })

  it('institutionId takes precedence over userId when both are provided', async () => {
    await analyticsService.getApprovalStats({ institutionId: 'inst-A', userId: 'user-1' })
    const calls = mockGroupBy.mock.calls
    calls.forEach(([arg]: [{ where: Record<string, unknown> }]) => {
      expect((arg.where.document as Record<string, unknown>).institutionId).toBe('inst-A')
    })
  })
})
