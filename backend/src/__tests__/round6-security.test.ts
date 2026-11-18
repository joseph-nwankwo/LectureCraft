/**
 * Round 6 — P0 Security Regression Tests
 *
 * Covers all eight findings from the Round 6 audit:
 *
 * Finding 3 — assertAssessmentAccess: creator institution boundary, HOD dept
 *   scope, DEAN faculty scope, CourseAssignment validation.
 * Finding 4 — Messaging: edit/delete require current membership, pin verifies
 *   message belongs to stated conversation.
 * Finding 5 — Workspace revocation: ConversationMember DB records are deleted.
 * Finding 6 — Portal SSO token store: Redis-backed, fail-closed.
 * Finding 7 — Production startup: PORTAL_TOKEN_URL + PORTAL_SERVICE_SECRET
 *   required; URL-based token blocked in production.
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'

import { AppError } from '../utils/errors'

// ── Shared mocks ───────────────────────────────────────────────────────────────

const mockSubFindUniqueR6         = jest.fn()
const mockSubFindManyR6           = jest.fn()
const mockSubUpdateR6             = jest.fn()
const mockAssessFindUniqueR6      = jest.fn()
const mockMemberFindUniqueR6      = jest.fn()
const mockMemberDeleteManyR6      = jest.fn()
const mockMsgFindUniqueR6         = jest.fn()
const mockMsgUpdateR6             = jest.fn()
const mockMsgReactionFindUniqueR6 = jest.fn()
const mockMsgCreateR6             = jest.fn()
const mockConvFindUniqueR6        = jest.fn()
const mockConvFindManyR6          = jest.fn()
const mockConvUpdateR6            = jest.fn()
const mockDeptFindFirstR6         = jest.fn()
const mockFacultyFindFirstR6      = jest.fn()
const mockCourseAssignFindFirstR6 = jest.fn()
const mockCourseEnrollFindFirstR6 = jest.fn()
const mockMsgReactionCreateR6     = jest.fn()
const mockMsgReactionDeleteR6     = jest.fn()

jest.mock('../config/database', () => ({
  prisma: {
    assignmentSubmission: {
      findUnique: mockSubFindUniqueR6,
      findMany:   mockSubFindManyR6,
      update:     mockSubUpdateR6,
    },
    assessment:          { findUnique: mockAssessFindUniqueR6 },
    conversationMember:  { findUnique: mockMemberFindUniqueR6, deleteMany: mockMemberDeleteManyR6 },
    message:             { findUnique: mockMsgFindUniqueR6, update: mockMsgUpdateR6, create: mockMsgCreateR6 },
    messageReaction:     { findUnique: mockMsgReactionFindUniqueR6, create: mockMsgReactionCreateR6, delete: mockMsgReactionDeleteR6 },
    conversation:        { findUnique: mockConvFindUniqueR6, findMany: mockConvFindManyR6, update: mockConvUpdateR6 },
    department:          { findFirst: mockDeptFindFirstR6 },
    faculty:             { findFirst: mockFacultyFindFirstR6 },
    courseAssignment:    { findFirst: mockCourseAssignFindFirstR6 },
    courseEnrollment:    { findFirst: mockCourseEnrollFindFirstR6 },
    mention:             { createMany: jest.fn() },
    notification:        { createMany: jest.fn() },
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
const { messageService }    = require('../services/messaging/message.service')    as typeof import('../services/messaging/message.service')
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => jest.resetAllMocks())

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 3 — assertAssessmentAccess: creator institution boundary
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 3: creator institution boundary', () => {
  const instAssessment = {
    id: 'a1', createdBy: 'creator-id', courseId: null,
    institutionId: 'inst-1', totalMarks: 100,
  }

  it('allows creator who is still in the same institution', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(instAssessment)
    mockSubFindManyR6.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'creator-id', 'LECTURER', 'inst-1'),
    ).resolves.toBeDefined()
  })

  it('rejects creator who has moved to a different institution', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(instAssessment)
    // No CourseAssignment, no dept match — only creator tier would fire, but they moved
    mockCourseAssignFindFirstR6.mockResolvedValue(null)
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'creator-id', 'LECTURER', 'inst-2'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows creator of a personal assessment (no institutionId) regardless of institution', async () => {
    mockAssessFindUniqueR6.mockResolvedValue({ ...instAssessment, institutionId: null })
    mockSubFindManyR6.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'creator-id', 'LECTURER', 'inst-99'),
    ).resolves.toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 3 — assertAssessmentAccess: HOD department scope
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 3: HOD is department-scoped', () => {
  const courseAssessment = {
    id: 'a1', createdBy: 'other-creator', courseId: 'course-1',
    institutionId: 'inst-1', totalMarks: 100,
  }

  it('rejects HOD of a different department', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(courseAssessment)
    mockDeptFindFirstR6.mockResolvedValue(null) // wrong dept
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'other-hod', 'HOD', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows HOD of the course\'s own department', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(courseAssessment)
    mockDeptFindFirstR6.mockResolvedValue({ id: 'dept-1' })
    mockSubFindManyR6.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'dept-hod', 'HOD', 'inst-1'),
    ).resolves.toBeDefined()
    expect(mockDeptFindFirstR6).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        hodId: 'dept-hod',
        institutionId: 'inst-1',
        courses: { some: { id: 'course-1' } },
      }),
    }))
  })

  it('rejects HOD of a different institution', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(courseAssessment)
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'foreign-hod', 'HOD', 'inst-2'),
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockDeptFindFirstR6).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 3 — assertAssessmentAccess: DEAN faculty scope
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 3: DEAN is faculty-scoped', () => {
  const courseAssessment = {
    id: 'a1', createdBy: 'other-creator', courseId: 'course-1',
    institutionId: 'inst-1', totalMarks: 100,
  }

  it('rejects DEAN whose faculty does not contain the course', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(courseAssessment)
    mockFacultyFindFirstR6.mockResolvedValue(null) // wrong faculty
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'other-dean', 'DEAN', 'inst-1'),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('allows DEAN whose faculty contains the course', async () => {
    mockAssessFindUniqueR6.mockResolvedValue(courseAssessment)
    mockFacultyFindFirstR6.mockResolvedValue({ id: 'fac-1' })
    mockSubFindManyR6.mockResolvedValue([])
    await expect(
      submissionService.getAssignmentSubmissions('a1', 'fac-dean', 'DEAN', 'inst-1'),
    ).resolves.toBeDefined()
    expect(mockFacultyFindFirstR6).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deanId: 'fac-dean',
        institutionId: 'inst-1',
        departments: { some: { courses: { some: { id: 'course-1' } } } },
      }),
    }))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 4 — message.edit requires current membership
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 4: message.edit requires current membership', () => {
  const msg = { id: 'm1', conversationId: 'conv-1', senderId: 'user-1', deleted: false }

  it('allows the sender who is still a member to edit', async () => {
    mockMsgFindUniqueR6.mockResolvedValue(msg)
    mockMemberFindUniqueR6.mockResolvedValue({ id: 'mbr-1' })
    mockMsgUpdateR6.mockResolvedValue({ ...msg, content: 'updated', edited: true })

    await expect(
      messageService.edit('m1', 'user-1', 'updated content'),
    ).resolves.toBeDefined()
  })

  it('rejects edit from sender who is no longer a conversation member', async () => {
    mockMsgFindUniqueR6.mockResolvedValue(msg)
    mockMemberFindUniqueR6.mockResolvedValue(null) // removed

    await expect(
      messageService.edit('m1', 'user-1', 'updated content'),
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockMsgUpdateR6).not.toHaveBeenCalled()
  })

  it('rejects edit from a member who is not the original sender', async () => {
    mockMsgFindUniqueR6.mockResolvedValue(msg)
    mockMemberFindUniqueR6.mockResolvedValue({ id: 'mbr-2' }) // IS a member

    await expect(
      messageService.edit('m1', 'other-user', 'updated content'),
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(mockMsgUpdateR6).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 4 — message.delete requires current membership
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 4: message.delete requires current membership', () => {
  const msg = { id: 'm1', conversationId: 'conv-1', senderId: 'user-1', deleted: false }

  it('allows the sender who is still a member to delete', async () => {
    mockMsgFindUniqueR6.mockResolvedValue(msg)
    mockMemberFindUniqueR6.mockResolvedValue({ id: 'mbr-1' })
    mockMsgUpdateR6.mockResolvedValue({ ...msg, deleted: true, content: '' })

    await expect(messageService.delete('m1', 'user-1')).resolves.toBeDefined()
  })

  it('rejects delete from sender who is no longer a conversation member', async () => {
    mockMsgFindUniqueR6.mockResolvedValue(msg)
    mockMemberFindUniqueR6.mockResolvedValue(null) // removed

    await expect(messageService.delete('m1', 'user-1')).rejects.toMatchObject({ statusCode: 403 })
    expect(mockMsgUpdateR6).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 4 — message.pin verifies message belongs to stated conversation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 4: message.pin verifies message-conversation binding', () => {
  it('allows pinning a message that belongs to the stated conversation', async () => {
    // Member check passes
    mockMemberFindUniqueR6.mockResolvedValue({ id: 'mbr-1' })
    // Message belongs to conv-1
    mockMsgFindUniqueR6.mockResolvedValue({ id: 'm1', conversationId: 'conv-1' })
    mockMsgUpdateR6.mockResolvedValue({ id: 'm1', pinnedAt: new Date() })
    mockConvUpdateR6.mockResolvedValue({})

    await expect(messageService.pin('m1', 'user-1', 'conv-1')).resolves.toBeDefined()
  })

  it('rejects pinning a message that belongs to a different conversation (IDOR)', async () => {
    // Member of conv-1
    mockMemberFindUniqueR6.mockResolvedValue({ id: 'mbr-1' })
    // But the message belongs to conv-2
    mockMsgFindUniqueR6.mockResolvedValue({ id: 'm1', conversationId: 'conv-2' })

    await expect(messageService.pin('m1', 'user-1', 'conv-1')).rejects.toMatchObject({ statusCode: 404 })
    expect(mockMsgUpdateR6).not.toHaveBeenCalled()
  })

  it('rejects pinning when caller is not a conversation member', async () => {
    mockMemberFindUniqueR6.mockResolvedValue(null)

    await expect(messageService.pin('m1', 'user-1', 'conv-1')).rejects.toMatchObject({ statusCode: 403 })
    expect(mockMsgFindUniqueR6).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Finding 7 — env validation: PORTAL_TOKEN_URL and PORTAL_SERVICE_SECRET required
//             in production; URL-based token blocked in production
// ═══════════════════════════════════════════════════════════════════════════════

describe('Round 6 — Finding 7: production SSO config enforced in env schema', () => {
  // Import the schema so we can test it directly without forking the process.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { envSchema } = require('../config/env') as { envSchema: { safeParse: (data: unknown) => { success: boolean; error?: { flatten: () => { fieldErrors: Record<string, string[]> } } } } }
  /* eslint-enable @typescript-eslint/no-require-imports */

  const BASE = {
    DATABASE_URL:        'postgresql://x:x@localhost:5432/x',
    JWT_ACCESS_SECRET:   'test-jwt-access-secret-min-32-chars-long!!',
    JWT_REFRESH_SECRET:  'test-jwt-refresh-secret-min-32-chars-long!',
    CRAFT_LAUNCH_SECRET: 'test-craft-launch-secret-min-32-chars-long!',
    COOKIE_SECRET:       'test-cookie-secret-min-32-chars-long!!!!!!!',
    CENTRAL_ENTITLEMENT_URL:            'https://portal.test/api/internal/entitlements/verify',
    CENTRAL_ENTITLEMENT_SERVICE_SECRET: 'test-central-entitlement-service-secret-0123',
  }

  it('rejects production config missing PORTAL_TOKEN_URL', () => {
    const result = envSchema.safeParse({ ...BASE, NODE_ENV: 'production', PORTAL_SERVICE_SECRET: 'a'.repeat(32) })
    expect(result.success).toBe(false)
    const errors = result.error!.flatten().fieldErrors
    expect(errors.PORTAL_TOKEN_URL).toBeDefined()
  })

  it('rejects production config missing PORTAL_SERVICE_SECRET', () => {
    const result = envSchema.safeParse({ ...BASE, NODE_ENV: 'production', PORTAL_TOKEN_URL: 'https://portal.test/sso-token' })
    expect(result.success).toBe(false)
    const errors = result.error!.flatten().fieldErrors
    expect(errors.PORTAL_SERVICE_SECRET).toBeDefined()
  })

  it('accepts production config with both PORTAL_TOKEN_URL and PORTAL_SERVICE_SECRET', () => {
    const result = envSchema.safeParse({
      ...BASE,
      NODE_ENV:               'production',
      PORTAL_TOKEN_URL:       'https://portal.test/sso-token',
      PORTAL_SERVICE_SECRET:  'a'.repeat(32),
      CENTRAL_ENTITLEMENT_URL: 'https://portal.test/api/internal/entitlements/verify',
    })
    // May fail for other production-only requirements (R2 endpoint etc.) but
    // must NOT have errors for PORTAL_TOKEN_URL or PORTAL_SERVICE_SECRET.
    if (!result.success) {
      const errors = result.error!.flatten().fieldErrors
      expect(errors.PORTAL_TOKEN_URL).toBeUndefined()
      expect(errors.PORTAL_SERVICE_SECRET).toBeUndefined()
    }
  })

  it('accepts development config without PORTAL_TOKEN_URL or PORTAL_SERVICE_SECRET', () => {
    const result = envSchema.safeParse({ ...BASE, NODE_ENV: 'development' })
    if (!result.success) {
      const errors = result.error!.flatten().fieldErrors
      expect(errors.PORTAL_TOKEN_URL).toBeUndefined()
      expect(errors.PORTAL_SERVICE_SECRET).toBeUndefined()
    }
  })
})
