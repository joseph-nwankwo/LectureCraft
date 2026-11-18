/**
 * SEC-04 regression tests: assessment cross-institution authorization
 *
 * Round 1 fix: get() PUBLISHED branch now carries institutionId.
 * Round 2 fix: institutionId moved to TOP-LEVEL of the where clause in both
 *   get() and list(). The createdBy branch no longer independently bypasses
 *   institution isolation — a user who has moved institutions cannot access
 *   assessments from their former institution through creator ownership.
 *
 * SQL shape after Round 2:
 *   WHERE id = ? AND institutionId = ? AND (createdBy = ? OR status = 'PUBLISHED')
 *
 * The institutionId must always match first; then within that institution,
 * either creator or published status grants access.
 */

import { jest } from '@jest/globals'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockFindFirst = jest.fn<() => Promise<Record<string, unknown> | null>>()

const mockPrisma = {
  assessment: { findFirst: mockFindFirst, findMany: jest.fn(), count: jest.fn() },
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
const ASSESS_ID  = 'assessment-xyz'

function publishedAssessment(overrides: Record<string, unknown> = {}) {
  return {
    id:            ASSESS_ID,
    createdBy:     CREATOR_ID,
    institutionId: INST_A,
    status:        'PUBLISHED',
    title:         'Sample Assessment',
    ...overrides,
  }
}

// ── get() — Round 2: institutionId at top-level ───────────────────────────────

describe('assessmentService.get() — Round 2: institutionId enforced at top level', () => {
  beforeEach(() => { jest.clearAllMocks() })

  // Helper to extract the where clause from the first findFirst call
  function getWhere() {
    return mockFindFirst.mock.calls[0]![0] as {
      where: { id?: string; institutionId?: string | null; OR?: Record<string, unknown>[] }
    }
  }

  // ── Structural verification ──

  it('institutionId is at the top-level where clause, not inside the OR branch', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await assessmentService.get(ASSESS_ID, OTHER_USER, INST_A)
    const { where } = getWhere()
    expect(where.institutionId).toBe(INST_A)
    // Neither OR branch should carry institutionId
    for (const branch of where.OR ?? []) {
      expect(branch).not.toHaveProperty('institutionId')
    }
  })

  it('the OR branches contain only createdBy and status — institution is not duplicated inside', async () => {
    mockFindFirst.mockResolvedValue(null)
    await assessmentService.get(ASSESS_ID, OTHER_USER, INST_A).catch(() => null)
    const { where } = getWhere()
    const orBranches = where.OR ?? []
    expect(orBranches).toHaveLength(2)
    expect(orBranches).toContainEqual({ createdBy: OTHER_USER })
    expect(orBranches).toContainEqual({ status: 'PUBLISHED' })
  })

  // ── Positive: legitimate access ──

  it('allows the creator to read their own published assessment within the same institution', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
    const { where } = getWhere()
    expect(where.institutionId).toBe(INST_A)
    expect(where.id).toBe(ASSESS_ID)
  })

  it('allows the creator to read their own draft assessment within the same institution', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ status: 'DRAFT' }))
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
  })

  it('allows an institution-A member to read a published assessment from institution A', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_A)).resolves.toBeDefined()
    const { where } = getWhere()
    expect(where.institutionId).toBe(INST_A)
  })

  it('allows a null-institution creator to read their own null-institution assessment', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ institutionId: null }))
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, null)).resolves.toBeDefined()
    const { where } = getWhere()
    expect(where.institutionId).toBeNull()
  })

  // ── Negative: cross-institution read must be blocked ──

  it('blocks institution-B user from reading institution-A published assessment', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_B)).rejects.toMatchObject({
      statusCode: 404,
    })
    const { where } = getWhere()
    expect(where.institutionId).toBe(INST_B) // query uses caller's institution
  })

  it('blocks institution-B user from reading institution-A draft assessment', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_B)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('blocks null-institution user from reading an institution-A assessment', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, null)).rejects.toMatchObject({
      statusCode: 404,
    })
    const { where } = getWhere()
    expect(where.institutionId).toBeNull() // institutionId IS NULL — not a wildcard
  })

  // ── Round 2: creator-isolation scenarios ──

  it('Round 2 — creator who moved to Institution B cannot read old Institution A assessment', async () => {
    // The user WAS creator of an INST_A assessment but their current JWT says INST_B.
    // The top-level institutionId = INST_B means the query cannot match the INST_A assessment.
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_B)).rejects.toMatchObject({
      statusCode: 404,
    })
    const { where } = getWhere()
    // The query must use INST_B, not INST_A — the caller's current context, not the assessment's
    expect(where.institutionId).toBe(INST_B)
    // The createdBy branch is still present but bounded by the top-level institutionId
    expect(where.OR).toContainEqual({ createdBy: CREATOR_ID })
  })

  it('Round 2 — creator with null-institution cannot read their former Institution A assessment', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, null)).rejects.toMatchObject({
      statusCode: 404,
    })
    const { where } = getWhere()
    expect(where.institutionId).toBeNull()
  })

  it('Round 2 — createdBy is NOT a top-level escape hatch (institutionId always applies)', async () => {
    // Before Round 2, createdBy had no institution filter — a creator from any institution
    // could read any assessment they created. This test confirms the fix.
    mockFindFirst.mockResolvedValue(null)
    await assessmentService.get(ASSESS_ID, CREATOR_ID, INST_B).catch(() => null)
    const { where } = getWhere()
    // The institutionId MUST be present at the top level — not inside a branch
    expect(where).toHaveProperty('institutionId', INST_B)
    // The createdBy is inside the OR, bounded by the top-level institutionId
    const creatorBranch = (where.OR ?? []).find((b) => 'createdBy' in b)
    expect(creatorBranch).toMatchObject({ createdBy: CREATOR_ID })
    expect(creatorBranch).not.toHaveProperty('institutionId') // constraint is at top level, not duplicated
  })
})

// ── list() — Round 2: institutionId at top-level ──────────────────────────────

describe('assessmentService.list() — Round 2: institutionId enforced at top level', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(0)
  })

  function getFindManyWhere() {
    return (mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: { institutionId?: string | null; OR?: Record<string, unknown>[] } & Record<string, unknown>
    }).where
  }

  it('institutionId is at the top-level of list() where clause', async () => {
    await assessmentService.list(OTHER_USER, INST_A, {})
    const where = getFindManyWhere()
    expect(where.institutionId).toBe(INST_A)
    for (const branch of where.OR ?? []) {
      expect(branch).not.toHaveProperty('institutionId')
    }
  })

  it('list() null institutionId uses IS NULL at the top level (not a wildcard)', async () => {
    await assessmentService.list(OTHER_USER, null, {})
    const where = getFindManyWhere()
    expect(where.institutionId).toBeNull()
  })

  it('list() createdBy branch shows only the caller\'s own assessments (within the institution)', async () => {
    await assessmentService.list(CREATOR_ID, INST_A, {})
    const where = getFindManyWhere()
    const creatorBranch = (where.OR ?? []).find((b) => 'createdBy' in b)
    expect(creatorBranch).toMatchObject({ createdBy: CREATOR_ID })
  })

  it('list() does not expose institution-B assessments to institution-A users', async () => {
    await assessmentService.list(OTHER_USER, INST_A, {})
    const where = getFindManyWhere()
    // The entire where clause must be scoped to INST_A, never mention INST_B
    const wholeWhere = JSON.stringify(where)
    expect(wholeWhere).not.toContain(INST_B)
  })

  it('Round 2 — list() for a user now in Institution B does not show old Institution A assessments', async () => {
    // User was CREATOR_ID in INST_A, now in INST_B. list() must scope to INST_B.
    await assessmentService.list(CREATOR_ID, INST_B, {})
    const where = getFindManyWhere()
    expect(where.institutionId).toBe(INST_B)
    expect(JSON.stringify(where)).not.toContain(INST_A)
  })

  it('Round 2 — null-institution list() cannot include institution-owned assessments', async () => {
    await assessmentService.list(OTHER_USER, null, {})
    const where = getFindManyWhere()
    expect(where.institutionId).toBeNull()
    // Any institutionId IS NULL query cannot match INST_A rows
    expect(JSON.stringify(where)).not.toContain(INST_A)
  })
})

// ── Preserved workflows ───────────────────────────────────────────────────────

describe('assessmentService — preserved workflows after Round 2 fix', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('creator with draft can still access their own assessment within their institution', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ status: 'DRAFT' }))
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
  })

  it('institution-A admin user can still access institution-A published assessments', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, 'admin-user', INST_A)).resolves.toBeDefined()
  })

  it('institution-A HOD/Dean can still access institution-A published assessments', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, 'hod-user', INST_A)).resolves.toBeDefined()
  })

  it('list() preserves pagination parameters', async () => {
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(0)
    const result = await assessmentService.list(OTHER_USER, INST_A, { page: 2, limit: 10 })
    expect(result.page).toBe(2)
    const call = mockPrisma.assessment.findMany.mock.calls[0]![0] as { skip: number; take: number }
    expect(call.skip).toBe(10)
    expect(call.take).toBe(10)
  })

  it('list() applies type filter without breaking institution scoping', async () => {
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(0)
    await assessmentService.list(OTHER_USER, INST_A, { type: 'QUIZ' })
    const where = (mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>
    }).where
    expect(where.type).toBe('QUIZ')
    expect(where.institutionId).toBe(INST_A) // institution scoping still present at top level
  })

  it('list() applies status filter without breaking institution scoping', async () => {
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(0)
    await assessmentService.list(CREATOR_ID, INST_A, { status: 'DRAFT' })
    const where = (mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: Record<string, unknown>
    }).where
    expect(where.status).toBe('DRAFT')
    expect(where.institutionId).toBe(INST_A)
  })

  it('list() returns correct pagination metadata', async () => {
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(45)
    const result = await assessmentService.list(OTHER_USER, INST_A, { page: 3, limit: 10 })
    expect(result.total).toBe(45)
    expect(result.totalPages).toBe(5)
    expect(result.page).toBe(3)
  })
})
