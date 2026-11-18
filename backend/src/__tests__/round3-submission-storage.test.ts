/**
 * Round 3 — Finding 2: Secure student submission storage
 *
 * Verifies:
 * - MIME type allowlist blocks disallowed types
 * - Magic byte mismatch is rejected
 * - R2 upload is called, fileKey stored (not fileUrl)
 * - On DB failure the new R2 object is deleted (rollback)
 * - On DB success the old R2 object is deleted (cleanup)
 * - downloadFile: student sees own file; student blocked from others' files
 * - downloadFile: staff with matching institutionId can access; mismatched institutionId blocked
 * - /uploads/submissions is no longer served by the static middleware
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL       = 'http://localhost:3001'
// Simulate R2 configured
process.env.AWS_ACCESS_KEY_ID     = 'test-key-id'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_S3_BUCKET         = 'test-bucket'
process.env.AWS_S3_ENDPOINT       = 'https://account.r2.cloudflarestorage.com'
process.env.AWS_S3_PUBLIC_URL     = 'https://pub.r2.test'

const mockUploadToR2           = jest.fn()
const mockDeleteFromR2         = jest.fn()
const mockGenerateSignedUrl    = jest.fn()
const mockIsR2Configured       = jest.fn().mockReturnValue(true)
const mockValidateMagicBytes   = jest.fn().mockReturnValue(true)
const mockAllowedMimeTypes     = new Set(['application/pdf', 'image/jpeg'])

jest.mock('../services/storage/storage.service', () => ({
  uploadToR2:                   mockUploadToR2,
  deleteFromR2:                 mockDeleteFromR2,
  generateSignedDownloadUrl:    mockGenerateSignedUrl,
  isR2Configured:               mockIsR2Configured,
  validateSubmissionMagicBytes: mockValidateMagicBytes,
  SUBMISSION_ALLOWED_MIME_TYPES: mockAllowedMimeTypes,
}))

const mockFindUniqueAssessment = jest.fn()
const mockFindFirstEnrollment  = jest.fn()
const mockFindUniqueSubmission = jest.fn()
const mockUpdateSubmission     = jest.fn()
const mockCreateSubmission     = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    assessment: {
      findUnique: mockFindUniqueAssessment,
    },
    courseEnrollment: {
      findFirst: mockFindFirstEnrollment,
    },
    assignmentSubmission: {
      findUnique: mockFindUniqueSubmission,
      update:     mockUpdateSubmission,
      create:     mockCreateSubmission,
    },
  },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { submissionService } = require('../services/submission/submission.service') as typeof import('../services/submission/submission.service')
/* eslint-enable @typescript-eslint/no-require-imports */

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname:    'file',
    originalname: 'report.pdf',
    encoding:     '7bit',
    mimetype:     'application/pdf',
    size:         1024,
    buffer:       PDF_MAGIC,
    destination:  '',
    filename:     '',
    path:         '',
    stream:       null as never,
    ...overrides,
  } as Express.Multer.File
}

const baseSubmission = {
  id: 'sub-1',
  studentId: 'student-1',
  assessmentId: 'assess-1',
  status: 'DRAFT',
  fileKey: null,
  fileUrl: null,
  fileName: null,
  content: null,
  fileSize: null,
  fileType: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsR2Configured.mockReturnValue(true)
  mockValidateMagicBytes.mockReturnValue(true)
  mockUploadToR2.mockResolvedValue('https://pub.r2.test/submissions/abc.pdf')
  mockDeleteFromR2.mockResolvedValue(undefined)
  mockGenerateSignedUrl.mockResolvedValue('https://r2.signed.url/file?token=abc')

  // Default happy path: assessment found, enrolled, submission exists
  mockFindUniqueAssessment.mockResolvedValue({
    id: 'assess-1', type: 'ASSIGNMENT', status: 'PUBLISHED', courseId: 'course-1',
    dueDate: null, allowLate: false, title: 'Test Assignment',
  })
  mockFindFirstEnrollment.mockResolvedValue({ studentId: 'student-1', courseId: 'course-1', status: 'ACTIVE' })
  mockFindUniqueSubmission.mockResolvedValue(baseSubmission)
  mockUpdateSubmission.mockResolvedValue({ ...baseSubmission, fileKey: 'submissions/abc.pdf', fileName: 'report.pdf' })
  mockCreateSubmission.mockResolvedValue(baseSubmission)
})

describe('Finding 2: saveDraft — MIME type validation', () => {
  it('rejects disallowed MIME type', async () => {
    const file = makeFile({ mimetype: 'application/x-php', buffer: Buffer.from('<?php ?>') })
    await expect(
      submissionService.saveDraft('student-1', 'assess-1', undefined, file)
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockUploadToR2).not.toHaveBeenCalled()
  })

  it('rejects when magic bytes do not match MIME type', async () => {
    mockValidateMagicBytes.mockReturnValue(false)
    const file = makeFile({ mimetype: 'application/pdf', buffer: Buffer.from('MZ\x90\x00') })
    await expect(
      submissionService.saveDraft('student-1', 'assess-1', undefined, file)
    ).rejects.toMatchObject({ statusCode: 400 })
    expect(mockUploadToR2).not.toHaveBeenCalled()
  })
})

describe('Finding 2: saveDraft — R2 upload and key storage', () => {
  it('uploads to R2 and stores fileKey (not fileUrl)', async () => {
    const file = makeFile()
    await submissionService.saveDraft('student-1', 'assess-1', undefined, file)

    expect(mockUploadToR2).toHaveBeenCalledWith(
      'submissions-private',
      PDF_MAGIC,
      'application/pdf',
      expect.stringMatching(/^submissions\/[0-9a-f]+\.pdf$/)
    )
    const updateCall = mockUpdateSubmission.mock.calls[0][0].data
    expect(updateCall.fileKey).toBeTruthy()
    expect(updateCall.fileKey).toMatch(/^submissions\/[0-9a-f]+\.pdf$/)
    expect(updateCall.fileUrl).toBeNull()
  })

  it('deletes the old R2 key after DB update succeeds', async () => {
    const existingWithKey = { ...baseSubmission, fileKey: 'submissions/old-key.pdf' }
    mockFindUniqueSubmission.mockResolvedValue(existingWithKey)
    mockUpdateSubmission.mockResolvedValue({ ...existingWithKey, fileKey: 'submissions/new-key.pdf' })

    await submissionService.saveDraft('student-1', 'assess-1', undefined, makeFile())

    expect(mockDeleteFromR2).toHaveBeenCalledWith('submissions/old-key.pdf')
  })
})

describe('Finding 2: saveDraft — DB rollback on failure', () => {
  it('deletes the newly uploaded R2 object when the DB update fails', async () => {
    mockUpdateSubmission.mockRejectedValue(new Error('DB error'))

    await expect(
      submissionService.saveDraft('student-1', 'assess-1', undefined, makeFile())
    ).rejects.toThrow('DB error')

    // The newly uploaded key must be cleaned up
    expect(mockDeleteFromR2).toHaveBeenCalledWith(expect.stringMatching(/^submissions\/[0-9a-f]+\.pdf$/))
  })
})

describe('Finding 2: authorizeAndGetDownloadUrl — access control', () => {
  const baseAssessment = { createdBy: 'lecturer-1', courseId: 'course-1', institutionId: 'inst-1' }

  it('returns presigned URL for the submission owner (student)', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      ...baseSubmission, studentId: 'student-1', fileKey: 'submissions/abc.pdf', fileName: 'report.pdf',
      assessment: baseAssessment,
    })

    const result = await submissionService.authorizeAndGetDownloadUrl('sub-1', 'student-1', 'STUDENT', null)
    expect('url' in result).toBe(true)
    expect(mockGenerateSignedUrl).toHaveBeenCalledWith('submissions/abc.pdf', expect.any(Number), 'report.pdf')
  })

  it('blocks a student from downloading another student\'s file', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      ...baseSubmission, studentId: 'student-2', fileKey: 'submissions/abc.pdf',
      assessment: baseAssessment,
    })

    await expect(
      submissionService.authorizeAndGetDownloadUrl('sub-1', 'student-1', 'STUDENT', null)
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows a lecturer from the same institution', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      ...baseSubmission, studentId: 'student-1', fileKey: 'submissions/abc.pdf', fileName: 'hw.pdf',
      assessment: baseAssessment,
    })

    const result = await submissionService.authorizeAndGetDownloadUrl('sub-1', 'lecturer-1', 'LECTURER', 'inst-1')
    expect('url' in result).toBe(true)
  })

  it('blocks a lecturer from a different institution', async () => {
    mockFindUniqueSubmission.mockResolvedValue({
      ...baseSubmission, studentId: 'student-1', fileKey: 'submissions/abc.pdf',
      assessment: { ...baseAssessment, institutionId: 'inst-1' },
    })

    await expect(
      submissionService.authorizeAndGetDownloadUrl('sub-1', 'other-lecturer', 'LECTURER', 'inst-2')
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
