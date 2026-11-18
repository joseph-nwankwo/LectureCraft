/**
 * Round 5 — Finding 2: Academic authorization for submission operations
 *
 * Verifies that the three-tier academic authorization (creator / admin+institution
 * / assigned-lecturer via CourseAssignment) is enforced on:
 *   - getAssignmentSubmissions
 *   - grade
 *   - returnSubmission
 *   - authorizeAndGetDownloadUrl (non-student path)
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAssessmentFindUnique = jest.fn()
const mockSubFindUnique        = jest.fn()
const mockSubFindMany          = jest.fn()
const mockSubUpdate            = jest.fn()
const mockCourseAssignFindFirst = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    assessment: { findUnique: mockAssessmentFindUnique },
    assignmentSubmission: {
      findUnique: mockSubFindUnique,
      findMany:   mockSubFindMany,
      update:     mockSubUpdate,
    },
    courseAssignment: { findFirst: mockCourseAssignFindFirst },
    courseEnrollment: { findFirst: jest.fn().mockResolvedValue({ id: 'e1' }) },
  },
}))

jest.mock('../services/storage/storage.service', () => ({
  isR2Configured:              jest.fn().mockReturnValue(false),
  SUBMISSION_ALLOWED_MIME_TYPES: new Set(['application/pdf']),
  validateSubmissionMagicBytes:  jest.fn().mockReturnValue(true),
  generateSignedDownloadUrl:     jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { submissionService } = require('../services/submission/submission.service') as typeof import('../services/submission/submission.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

// ── Assessment for institutional course ───────────────────────────────────────
const institutionalAssessment = {
  id: 'a1', createdBy: 'creator-id', courseId: 'course-1',
  institutionId: 'inst-1', totalMarks: 100,
}

// ── getAssignmentSubmissions ───────────────────────────────────────────────────

describe('Round 5 — Finding 2: getAssignmentSubmissions authorization', () => {
  it('allows the creator regardless of role', async () => {
    mockAssessmentFindUnique.mockResolvedValue(institutionalAssessment)
    mockSubFindMany.mockResolvedValue([])

    await expect(
      submissionService.getAssignmentSubmissions('a1', 'creator-id', 'LECTURER', 'inst-1'),
    ).resolves.toBeDefined()
  })

  it('allows a HOD from the same institution without CourseAssignment', async () => {
    mockAssessmentFindUnique.mockResolvedValue(institutionalAssessment)
    mockSubFindMany.mockResolvedValue([])

    await expect(
      submissionService.getAssignmentSubmissions('a1', 'other-lecturer', 'HOD', 'inst-1'),
    ).resolves.toBeDefined()
  })

  it('rejects a plain LECTURER from the same institution without CourseAssignment', async () => {
    mockAssessmentFindUnique.mockResolvedValue(institutionalAssessment)
    mockCourseAssignFindFirst.mockResolvedValue(null) // no assignment

    await expect(
      submissionService.getAssignmentSubmissions('a1', 'other-lecturer', 'LECTURER', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a LECTURER with a CourseAssignment for the course', async () => {
    mockAssessmentFindUnique.mockResolvedValue(institutionalAssessment)
    mockCourseAssignFindFirst.mockResolvedValue({ id: 'ca1', lecturerId: 'assigned-lecturer', courseId: 'course-1' })
    mockSubFindMany.mockResolvedValue([])

    await expect(
      submissionService.getAssignmentSubmissions('a1', 'assigned-lecturer', 'LECTURER', 'inst-1'),
    ).resolves.toBeDefined()

    expect(mockCourseAssignFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lecturerId: 'assigned-lecturer', courseId: 'course-1' },
      }),
    )
  })

  it('rejects a lecturer from a different institution even with CourseAssignment', async () => {
    mockAssessmentFindUnique.mockResolvedValue(institutionalAssessment)
    // courseAssignment check is never reached if sameInstitution is false

    await expect(
      submissionService.getAssignmentSubmissions('a1', 'foreign-lecturer', 'LECTURER', 'inst-2'),
    ).rejects.toMatchObject({ statusCode: 403 })

    expect(mockCourseAssignFindFirst).not.toHaveBeenCalled()
  })
})

// ── grade ─────────────────────────────────────────────────────────────────────

describe('Round 5 — Finding 2: grade authorization', () => {
  const sub = {
    id: 's1', status: 'SUBMITTED', studentId: 'student-1',
    assessment: { totalMarks: 100, createdBy: 'creator-id', courseId: 'course-1', institutionId: 'inst-1' },
  }

  it('allows the creator to grade', async () => {
    mockSubFindUnique.mockResolvedValue(sub)
    mockSubUpdate.mockResolvedValue({ ...sub, grade: 80, status: 'GRADED' })

    await expect(
      submissionService.grade('s1', 'creator-id', 'LECTURER', 'inst-1', 80),
    ).resolves.toBeDefined()
  })

  it('rejects a plain LECTURER without CourseAssignment even in same institution', async () => {
    mockSubFindUnique.mockResolvedValue(sub)
    mockCourseAssignFindFirst.mockResolvedValue(null)

    await expect(
      submissionService.grade('s1', 'other-lecturer', 'LECTURER', 'inst-1', 80),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a LECTURER with CourseAssignment to grade', async () => {
    mockSubFindUnique.mockResolvedValue(sub)
    mockCourseAssignFindFirst.mockResolvedValue({ id: 'ca1' })
    mockSubUpdate.mockResolvedValue({ ...sub, grade: 75, status: 'GRADED' })

    await expect(
      submissionService.grade('s1', 'assigned-lecturer', 'LECTURER', 'inst-1', 75),
    ).resolves.toBeDefined()
  })
})

// ── returnSubmission ──────────────────────────────────────────────────────────

describe('Round 5 — Finding 2: returnSubmission authorization', () => {
  const sub = {
    id: 's1', status: 'SUBMITTED',
    assessment: { createdBy: 'creator-id', courseId: 'course-1', institutionId: 'inst-1' },
  }

  it('rejects a LECTURER with no CourseAssignment', async () => {
    mockSubFindUnique.mockResolvedValue(sub)
    mockCourseAssignFindFirst.mockResolvedValue(null)

    await expect(
      submissionService.returnSubmission('s1', 'other-lecturer', 'LECTURER', 'inst-1', 'Please revise'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows the creator to return', async () => {
    mockSubFindUnique.mockResolvedValue(sub)
    mockSubUpdate.mockResolvedValue({ ...sub, status: 'RETURNED' })

    await expect(
      submissionService.returnSubmission('s1', 'creator-id', 'LECTURER', 'inst-1', 'Good start, please revise'),
    ).resolves.toBeDefined()
  })
})

// ── authorizeAndGetDownloadUrl (non-student) ──────────────────────────────────

describe('Round 5 — Finding 2: authorizeAndGetDownloadUrl (non-student)', () => {
  const submissionWithFile = {
    id: 's1', studentId: 'student-1', fileKey: 'submissions/abc.pdf', fileUrl: null, fileName: 'essay.pdf',
    assessment: { createdBy: 'creator-id', courseId: 'course-1', institutionId: 'inst-1' },
  }

  it('allows the creator (non-student) to download — auth passes, then 500 because R2 is unconfigured', async () => {
    mockSubFindUnique.mockResolvedValue(submissionWithFile)
    // Auth check passes (creator), but isR2Configured() returns false → AppError.internal (500)
    // We verify the error is NOT 403 (auth was not the blocker).
    await expect(
      submissionService.authorizeAndGetDownloadUrl('s1', 'creator-id', 'LECTURER', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  // 403 cases:

  it('rejects a LECTURER with no CourseAssignment (non-student download)', async () => {
    mockSubFindUnique.mockResolvedValue(submissionWithFile)
    mockCourseAssignFindFirst.mockResolvedValue(null)

    await expect(
      submissionService.authorizeAndGetDownloadUrl('s1', 'other-lecturer', 'LECTURER', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a lecturer from a different institution', async () => {
    mockSubFindUnique.mockResolvedValue(submissionWithFile)

    await expect(
      submissionService.authorizeAndGetDownloadUrl('s1', 'foreign-lecturer', 'LECTURER', 'inst-2'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
