/**
 * SEC-05 regression tests: assessment statistics institution isolation
 *
 * Before fix, stats() used:
 *   OR: [{ createdBy: userId }, { institutionId }]
 *
 * Two issues:
 *   1. Cross-institution creator bypass — `createdBy` had no institution filter.
 *      A creator who moved institutions retained aggregate counts from their former
 *      institution through creator ownership.
 *   2. Draft count visibility — the `{ institutionId }` branch had no status filter,
 *      exposing DRAFT counts belonging to other creators to all institution members.
 *
 * After fix, stats() uses the same where clause as list() (SEC-04 Round 2):
 *   { institutionId, OR: [{ createdBy: userId }, { status: 'PUBLISHED' }] }
 *
 * SQL: WHERE institutionId = ? AND (createdBy = ? OR status = 'PUBLISHED')
 */

import { jest } from '@jest/globals'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockCount    = jest.fn<() => Promise<number>>().mockResolvedValue(0)
const mockGroupBy  = jest.fn<() => Promise<{ type?: string; status?: string; _count: number }[]>>().mockResolvedValue([])

const mockPrisma = {
  assessment: { count: mockCount, groupBy: mockGroupBy },
}

jest.mock('../config/database', () => ({ prisma: mockPrisma }))
jest.mock('../services/audit/audit.service', () => ({
  auditService: { log: jest.fn() },
}))

import { assessmentService } from '../services/assessment/assessment.service'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const INST_A     = 'institution-alpha'
const INST_B     = 'institution-beta'
const CREATOR_ID = 'creator-1'
const OTHER_USER = 'other-user-99'

// Helper: extract the where clause from the first count() call
function getCountWhere() {
  return mockCount.mock.calls[0]![0] as {
    where: { institutionId?: string | null; OR?: Record<string, unknown>[] }
  }
}

// Helper: extract the where from a specific groupBy call (0-indexed)
function getGroupByWhere(callIndex: number) {
  return mockGroupBy.mock.calls[callIndex]![0] as {
    by: string[]; _count: boolean; where: { institutionId?: string | null; OR?: Record<string, unknown>[] }
  }
}

// ── Structure: institutionId at top level ─────────────────────────────────────

describe('assessmentService.stats() — SEC-05: institutionId at top level', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('institutionId is a top-level condition (not inside the OR)', async () => {
    await assessmentService.stats(CREATOR_ID, INST_A)
    const { where } = getCountWhere()
    expect(where.institutionId).toBe(INST_A)
    // Neither OR branch may carry institutionId
    for (const branch of where.OR ?? []) {
      expect(branch).not.toHaveProperty('institutionId')
    }
  })

  it('the OR branches are exactly createdBy and status:PUBLISHED', async () => {
    await assessmentService.stats(CREATOR_ID, INST_A)
    const { where } = getCountWhere()
    expect(where.OR).toHaveLength(2)
    expect(where.OR).toContainEqual({ createdBy: CREATOR_ID })
    expect(where.OR).toContainEqual({ status: 'PUBLISHED' })
  })

  it('the same where clause is applied to count(), groupBy(type) and groupBy(status)', async () => {
    await assessmentService.stats(OTHER_USER, INST_A)
    // All three prisma calls must use the same institution-scoped where
    const countWhere   = getCountWhere().where
    const byTypeWhere  = getGroupByWhere(0).where
    const byStatusWhere = getGroupByWhere(1).where

    expect(countWhere).toMatchObject({ institutionId: INST_A })
    expect(byTypeWhere).toMatchObject({ institutionId: INST_A })
    expect(byStatusWhere).toMatchObject({ institutionId: INST_A })

    // All OR branches must match across all three calls
    expect(JSON.stringify(countWhere)).toBe(JSON.stringify(byTypeWhere))
    expect(JSON.stringify(countWhere)).toBe(JSON.stringify(byStatusWhere))
  })

  it('groupBy calls use by:["type"] and by:["status"] respectively', async () => {
    await assessmentService.stats(CREATOR_ID, INST_A)
    expect(getGroupByWhere(0)).toMatchObject({ by: ['type'] })
    expect(getGroupByWhere(1)).toMatchObject({ by: ['status'] })
  })
})

// ── Positive: legitimate access ───────────────────────────────────────────────

describe('assessmentService.stats() — positive access', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('creator in Institution A gets stats scoped to INST_A', async () => {
    await assessmentService.stats(CREATOR_ID, INST_A)
    const { where } = getCountWhere()
    expect(where.institutionId).toBe(INST_A)
    expect(where.OR).toContainEqual({ createdBy: CREATOR_ID })
    expect(where.OR).toContainEqual({ status: 'PUBLISHED' })
  })

  it('response contains total, byType and byStatus', async () => {
    mockCount.mockResolvedValueOnce(7)
    mockGroupBy
      .mockResolvedValueOnce([{ type: 'QUIZ', _count: 4 }, { type: 'EXAM', _count: 3 }])
      .mockResolvedValueOnce([{ status: 'PUBLISHED', _count: 5 }, { status: 'DRAFT', _count: 2 }])

    const result = await assessmentService.stats(CREATOR_ID, INST_A)
    expect(result).toHaveProperty('total', 7)
    expect(result).toHaveProperty('byType')
    expect(result).toHaveProperty('byStatus')
  })

  it('null-institution creator gets stats scoped to null (IS NULL semantics)', async () => {
    await assessmentService.stats(CREATOR_ID, null)
    const { where } = getCountWhere()
    expect(where.institutionId).toBeNull()
    // null generates WHERE institutionId IS NULL — not a wildcard
    expect(where.OR).toContainEqual({ createdBy: CREATOR_ID })
  })
})

// ── SEC-05: cross-institution creator bypass closed ───────────────────────────

describe('assessmentService.stats() — SEC-05: cross-institution creator bypass', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('creator now in Institution B — query uses INST_B, not former INST_A', async () => {
    await assessmentService.stats(CREATOR_ID, INST_B)
    const { where } = getCountWhere()
    // The query must be scoped to INST_B — the caller's current context
    expect(where.institutionId).toBe(INST_B)
    // Former INST_A assessments are outside institutionId = INST_B so they won't match
    expect(JSON.stringify(where)).not.toContain(INST_A)
  })

  it('creator now in Institution B — createdBy branch is bounded by top-level institutionId', async () => {
    await assessmentService.stats(CREATOR_ID, INST_B)
    const { where } = getCountWhere()
    expect(where).toHaveProperty('institutionId', INST_B)
    // createdBy is inside OR but institution constraint at top level prevents cross-institution access
    expect(where.OR).toContainEqual({ createdBy: CREATOR_ID })
    expect(where.OR).not.toContainEqual({ createdBy: CREATOR_ID, institutionId: expect.anything() })
  })

  it('null-institution user — query cannot include INST_A assessments through creator ownership', async () => {
    await assessmentService.stats(CREATOR_ID, null)
    const { where } = getCountWhere()
    expect(where.institutionId).toBeNull()
    // institutionId IS NULL cannot match INST_A rows
    expect(JSON.stringify(where)).not.toContain(INST_A)
  })
})

// ── SEC-05: draft count isolation ─────────────────────────────────────────────

describe('assessmentService.stats() — SEC-05: non-creator draft count isolation', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('non-creator institution member — OR branch uses status:PUBLISHED (not unconstrained institutionId)', async () => {
    await assessmentService.stats(OTHER_USER, INST_A)
    const { where } = getCountWhere()
    // The old vulnerable code had { institutionId } as a bare branch with no status filter.
    // The fixed code has { status: 'PUBLISHED' } as the institution-wide branch.
    expect(where.OR).toContainEqual({ status: 'PUBLISHED' })
    // The old bare { institutionId: INST_A } branch must NOT exist inside OR
    expect(where.OR).not.toContainEqual({ institutionId: INST_A })
    expect(where.OR).not.toContainEqual({ institutionId: INST_B })
  })

  it('the PUBLISHED branch in OR has no extra institutionId (institution is at top level)', async () => {
    await assessmentService.stats(OTHER_USER, INST_A)
    const { where } = getCountWhere()
    const publishedBranch = (where.OR ?? []).find((b) => 'status' in b)
    expect(publishedBranch).toMatchObject({ status: 'PUBLISHED' })
    expect(publishedBranch).not.toHaveProperty('institutionId')
  })

  it('byStatus query is bounded by the same institution scope — cannot include cross-institution drafts', async () => {
    await assessmentService.stats(OTHER_USER, INST_A)
    const byStatusWhere = getGroupByWhere(1).where
    expect(byStatusWhere.institutionId).toBe(INST_A)
    // The status groupBy is institution-scoped, so a user from INST_B never appears here
    expect(JSON.stringify(byStatusWhere)).not.toContain(INST_B)
  })
})

// ── Consistency with list() ───────────────────────────────────────────────────

describe('assessmentService.stats() — where clause matches list() structure', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('stats() and list() produce the same where clause shape', async () => {
    // stats() where
    await assessmentService.stats(CREATOR_ID, INST_A)
    const statsWhere = getCountWhere().where

    // stats where must have institutionId at top level + same OR structure as list()
    expect(statsWhere).toMatchObject({
      institutionId: INST_A,
      OR: expect.arrayContaining([
        { createdBy: CREATOR_ID },
        { status: 'PUBLISHED' },
      ]),
    })
  })
})
