/**
 * SEC-04 regression tests: assessment cross-institution authorization
 *
 * Verifies that assessmentService.get() and assessmentService.list() enforce
 * institution boundaries correctly.
 *
 * Before the fix, get() used { status: 'PUBLISHED' } with no institutionId
 * filter, allowing any authenticated user to read any published assessment by
 * ID regardless of institution.
 *
 * After the fix, the PUBLISHED branch in get() is scoped to { institutionId,
 * status: 'PUBLISHED' }, where institutionId comes from the authenticated
 * caller's context, never from the request body.
 */

import { jest } from '@jest/globals'
import { AppError } from '../utils/errors'

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

// ── get() — cross-institution read by ID ─────────────────────────────────────

describe('assessmentService.get() — SEC-04 institution scoping', () => {
  beforeEach(() => { jest.clearAllMocks() })

  // ── Positive: legitimate access ──

  it('allows the creator to read their own published assessment', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
    const call = mockFindFirst.mock.calls[0]![0] as { where: Record<string, unknown> }
    expect(call.where.id).toBe(ASSESS_ID)
  })

  it('allows the creator to read their own draft assessment', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ status: 'DRAFT' }))
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
  })

  it('allows an institution-A member to read a published assessment from institution A', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_A)).resolves.toBeDefined()
    const call = mockFindFirst.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }
    // The PUBLISHED branch must carry institutionId = INST_A
    const publishedBranch = call.where.OR.find((b) => 'status' in b)
    expect(publishedBranch).toMatchObject({ institutionId: INST_A, status: 'PUBLISHED' })
  })

  it('allows a null-institution user to read a null-institution published assessment', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ institutionId: null }))
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, null)).resolves.toBeDefined()
    const call = mockFindFirst.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }
    const publishedBranch = call.where.OR.find((b) => 'status' in b)
    expect(publishedBranch).toMatchObject({ institutionId: null, status: 'PUBLISHED' })
  })

  // ── Negative: cross-institution read must be blocked ──

  it('blocks institution-B user from reading institution-A published assessment (the SEC-04 fix)', async () => {
    // findFirst returns null — the query no longer matches because institutionId = INST_B
    // but the assessment has institutionId = INST_A
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_B)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('the PUBLISHED branch query does NOT use a wildcard — it carries the caller institutionId', async () => {
    mockFindFirst.mockResolvedValue(null)
    await assessmentService.get(ASSESS_ID, OTHER_USER, INST_B).catch(() => null)
    const call = mockFindFirst.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }
    const publishedBranch = call.where.OR.find((b) => 'status' in b)
    // Must NOT be { status: 'PUBLISHED' } alone — institutionId must be present
    expect(publishedBranch).toHaveProperty('institutionId', INST_B)
    expect(publishedBranch).toHaveProperty('status', 'PUBLISHED')
  })

  it('blocks null-institution user from reading an institution-A published assessment', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, null)).rejects.toMatchObject({
      statusCode: 404,
    })
    const call = mockFindFirst.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }
    const publishedBranch = call.where.OR.find((b) => 'status' in b)
    // institutionId: null generates WHERE institutionId IS NULL — not a wildcard
    expect(publishedBranch).toMatchObject({ institutionId: null, status: 'PUBLISHED' })
  })

  it('blocks institution-B user from reading institution-A draft assessment (non-creator)', async () => {
    mockFindFirst.mockResolvedValue(null)
    await expect(assessmentService.get(ASSESS_ID, OTHER_USER, INST_B)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('the createdBy branch does not carry an institution filter (intentional creator policy)', async () => {
    mockFindFirst.mockResolvedValue(null)
    await assessmentService.get(ASSESS_ID, CREATOR_ID, INST_B).catch(() => null)
    const call = mockFindFirst.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }
    const creatorBranch = call.where.OR.find((b) => 'createdBy' in b)
    expect(creatorBranch).toMatchObject({ createdBy: CREATOR_ID })
    expect(creatorBranch).not.toHaveProperty('institutionId')
  })
})

// ── list() — institution scoping verification ─────────────────────────────────

describe('assessmentService.list() — institution boundary verification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma.assessment.findMany.mockResolvedValue([])
    mockPrisma.assessment.count.mockResolvedValue(0)
  })

  it('list() PUBLISHED branch carries the caller institutionId (not a wildcard)', async () => {
    await assessmentService.list(OTHER_USER, INST_A, {})
    const findManyCall = mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: { OR: Record<string, unknown>[] }
    }
    const publishedBranch = findManyCall.where.OR.find((b) => 'status' in b)
    expect(publishedBranch).toMatchObject({ institutionId: INST_A, status: 'PUBLISHED' })
  })

  it('list() PUBLISHED branch with null institutionId uses IS NULL (not wildcard)', async () => {
    await assessmentService.list(OTHER_USER, null, {})
    const findManyCall = mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: { OR: Record<string, unknown>[] }
    }
    const publishedBranch = findManyCall.where.OR.find((b) => 'status' in b)
    // institutionId: null in Prisma → WHERE institutionId IS NULL (not wildcard)
    expect(publishedBranch).toMatchObject({ institutionId: null, status: 'PUBLISHED' })
  })

  it('list() createdBy branch shows the caller only their own assessments', async () => {
    await assessmentService.list(CREATOR_ID, INST_A, {})
    const findManyCall = mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: { OR: Record<string, unknown>[] }
    }
    const creatorBranch = findManyCall.where.OR.find((b) => 'createdBy' in b)
    expect(creatorBranch).toMatchObject({ createdBy: CREATOR_ID })
  })

  it('list() does not expose institution-B assessments to institution-A users', async () => {
    await assessmentService.list(OTHER_USER, INST_A, {})
    const findManyCall = mockPrisma.assessment.findMany.mock.calls[0]![0] as {
      where: { OR: Record<string, unknown>[] }
    }
    // No branch must reference INST_B
    const wholeWhere = JSON.stringify(findManyCall.where)
    expect(wholeWhere).not.toContain(INST_B)
  })
})

// ── Preserved workflows ───────────────────────────────────────────────────────

describe('assessmentService — preserved workflows after SEC-04 fix', () => {
  beforeEach(() => { jest.clearAllMocks() })

  it('creator with draft can still access their own assessment', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment({ status: 'DRAFT' }))
    await expect(assessmentService.get(ASSESS_ID, CREATOR_ID, INST_A)).resolves.toBeDefined()
  })

  it('institution-A admin user can still access institution-A published assessments', async () => {
    mockFindFirst.mockResolvedValue(publishedAssessment())
    await expect(assessmentService.get(ASSESS_ID, 'admin-user', INST_A)).resolves.toBeDefined()
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
    const call = mockPrisma.assessment.findMany.mock.calls[0]![0] as { where: Record<string, unknown> }
    expect(call.where.type).toBe('QUIZ')
    // Institution scoping still present
    const or = call.where.OR as Record<string, unknown>[]
    expect(or.some((b) => (b as { institutionId?: string }).institutionId === INST_A)).toBe(true)
  })
})
