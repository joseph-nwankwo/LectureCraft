/**
 * Round 4 — Finding 2: Submission academic authorization
 *
 * Verifies:
 * - grade() rejects a lecturer who is not the creator AND not same-institution
 * - grade() allows the creator (regardless of institution)
 * - grade() allows same-institution staff (non-creator)
 * - returnSubmission() rejects unauthorized actor
 * - returnSubmission() allows the creator
 * - getAssignmentSubmissions() rejects a lecturer from a different institution who is not the creator
 * - getAssignmentSubmissions() allows the creator
 * - getAssignmentSubmissions() allows same-institution admin
 * - authorizeAndGetDownloadUrl() fails closed when assessment.institutionId is null and caller is not creator
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'

const mockFindUniqueAssessment    = jest.fn()
const mockFindFirstEnrollment     = jest.fn()
const mockFindUniqueSubmission    = jest.fn()
const mockUpdateSubmission        = jest.fn()
const mockCreateSubmission        = jest.fn()
const mockFindManySubmissions     = jest.fn()
const mockFindFirstCourseAssignment = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    assessment: { findUnique: mockFindUniqueAssessment },
    courseEnrollment: { findFirst: mockFindFirstEnrollment },
    assignmentSubmission: {
      findUnique: mockFindUniqueSubmission,
      update:     mockUpdateSubmission,
      create:     mockCreateSubmission,
      findMany:   mockFindManySubmissions,
    },
    courseAssignment: { findFirst: mockFindFirstCourseAssignment },
  },
}))

jest.mock('../services/storage/storage.service', () => ({
  uploadToR2:                   jest.fn(),
  deleteFromR2:                 jest.fn(),
  generateSignedDownloadUrl:    jest.fn().mockResolvedValue('https://r2.signed/file'),
  isR2Configured:               jest.fn().mockReturnValue(false),
  validateSubmissionMagicBytes: jest.fn().mockReturnValue(true),
  SUBMISSION_ALLOWED_MIME_TYPES: new Set(['application/pdf']),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { submissionService } = require('../services/submission/submission.service') as typeof import('../services/submission/submission.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

// ── grade() ──────────────────────────────────────────────────────────────────

describe('Finding 2: grade() authorization', () => {
  const baseAssessment = { totalMarks: 100, createdBy: 'lecturer-1', institutionId: 'inst-1' }

  function makeSub(overrides = {}) {
    return {
      id: 'sub-1', studentId: 'student-1', assessmentId: 'assess-1',
      status: 'SUBMITTED', assessment: baseAssessment, ...overrides,
    }
  }

  it('rejects a grader who is not the creator and from a different institution', async () => {
    mockFindUniqueSubmission.mockResolvedValue(makeSub())
    await expect(
      submissionService.grade('sub-1', 'other-lecturer', 'LECTURER', 'inst-2', 50)
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockUpdateSubmission).not.toHaveBeenCalled()
  })

  it('allows the creator (same institution)', async () => {
    mockFindUniqueSubmission.mockResolvedValue(makeSub())
    mockUpdateSubmission.mockResolvedValue(makeSub({ grade: 80, status: 'GRADED' }))
    await expect(
      submissionService.grade('sub-1', 'lecturer-1', 'LECTURER', 'inst-1', 80)
    ).resolves.toBeDefined()
  })

  it('allows same-institution staff who is not the creator', async () => {
    mockFindUniqueSubmission.mockResolvedValue(makeSub())
    mockUpdateSubmission.mockResolvedValue(makeSub({ grade: 70, status: 'GRADED' }))
    await expect(
      submissionService.grade('sub-1', 'head-of-dept', 'HOD', 'inst-1', 70)
    ).resolves.toBeDefined()
  })
})

// ── returnSubmission() ────────────────────────────────────────────────────────

describe('Finding 2: returnSubmission() authorization', () => {
  const baseAssessment = { createdBy: 'lecturer-1', institutionId: 'inst-1' }

  it('rejects an actor from a different institution who is not the creator', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      id: 'sub-1', assessment: baseAssessment,
    })
    await expect(
      submissionService.returnSubmission('sub-1', 'outsider', 'LECTURER', 'inst-2', 'Please revise')
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockUpdateSubmission).not.toHaveBeenCalled()
  })

  it('allows the creator of the assessment', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      id: 'sub-1', assessment: baseAssessment,
    })
    mockUpdateSubmission.mockResolvedValue({ id: 'sub-1', status: 'RETURNED' })
    await expect(
      submissionService.returnSubmission('sub-1', 'lecturer-1', 'LECTURER', 'inst-1', 'Please revise')
    ).resolves.toBeDefined()
  })
})

// ── getAssignmentSubmissions() ────────────────────────────────────────────────

describe('Finding 2: getAssignmentSubmissions() authorization', () => {
  it('rejects a cross-institution non-creator lecturer', async () => {
    mockFindUniqueAssessment.mockResolvedValue({
      id: 'assess-1', createdBy: 'lecturer-1', courseId: 'c-1', institutionId: 'inst-1',
    })
    await expect(
      submissionService.getAssignmentSubmissions('assess-1', 'other-lecturer', 'LECTURER', 'inst-2')
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockFindManySubmissions).not.toHaveBeenCalled()
  })

  it('allows the creator of the assessment', async () => {
    mockFindUniqueAssessment.mockResolvedValue({
      id: 'assess-1', createdBy: 'lecturer-1', courseId: 'c-1', institutionId: 'inst-1',
    })
    mockFindManySubmissions.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('assess-1', 'lecturer-1', 'LECTURER', 'inst-1')
    ).resolves.toBeDefined()
  })

  it('allows a same-institution admin who is not the creator', async () => {
    mockFindUniqueAssessment.mockResolvedValue({
      id: 'assess-1', createdBy: 'lecturer-1', courseId: 'c-1', institutionId: 'inst-1',
    })
    mockFindManySubmissions.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('assess-1', 'admin-user', 'UNIVERSITY_ADMIN', 'inst-1')
    ).resolves.toBeDefined()
  })

  it('rejects a same-institution LECTURER who is not the creator', async () => {
    mockFindUniqueAssessment.mockResolvedValue({
      id: 'assess-1', createdBy: 'lecturer-1', courseId: 'c-1', institutionId: 'inst-1',
    })
    mockFindFirstCourseAssignment.mockResolvedValue(null) // no CourseAssignment → 403
    await expect(
      submissionService.getAssignmentSubmissions('assess-1', 'other-lecturer', 'LECTURER', 'inst-1')
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})

// ── authorizeAndGetDownloadUrl() — null-institution fail-closed ───────────────

describe('Finding 2: authorizeAndGetDownloadUrl() null-institution bypass', () => {
  it('blocks non-creator staff when assessment.institutionId is null', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      id: 'sub-1', studentId: 'student-1', fileKey: 'submissions/abc.pdf', fileName: 'hw.pdf',
      assessment: { createdBy: 'lecturer-1', courseId: 'c-1', institutionId: null },
    })
    await expect(
      submissionService.authorizeAndGetDownloadUrl('sub-1', 'other-lecturer', 'LECTURER', 'inst-1')
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows the creator when assessment.institutionId is null', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      id: 'sub-1', studentId: 'student-1', fileKey: 'submissions/abc.pdf', fileName: 'hw.pdf',
      assessment: { createdBy: 'lecturer-1', courseId: 'c-1', institutionId: null },
    })

    const { generateSignedDownloadUrl } = require('../services/storage/storage.service') as { generateSignedDownloadUrl: jest.Mock }
    const { isR2Configured } = require('../services/storage/storage.service') as { isR2Configured: jest.Mock }
    isR2Configured.mockReturnValue(true)
    generateSignedDownloadUrl.mockResolvedValue('https://r2.signed/file')

    await expect(
      submissionService.authorizeAndGetDownloadUrl('sub-1', 'lecturer-1', 'LECTURER', null)
    ).resolves.toHaveProperty('url')
  })
})
