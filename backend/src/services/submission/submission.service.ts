import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import {
  isR2Configured,
  uploadToR2,
  deleteFromR2,
  generateSignedDownloadUrl,
  SUBMISSION_ALLOWED_MIME_TYPES,
  validateSubmissionMagicBytes,
} from '../storage/storage.service'

const SUBMISSION_MAX_SIZE_BYTES  = 20 * 1024 * 1024   // 20 MB (enforced by multer, but double-check)
const SUBMISSION_SIGNED_URL_TTL  = 10 * 60             // 10 minutes

// ── Safe extension from MIME type (never from user-supplied filename) ──────────
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.oasis.opendocument.text': 'odt',
  'text/plain': 'txt',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/zip': 'zip',
}

function submissionExtFromMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'bin'
}

export const submissionService = {
  async getOrCreate(studentId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, type: true, status: true, courseId: true, dueDate: true, allowLate: true, title: true },
    })
    if (!assessment) throw AppError.notFound('Assignment not found')
    if (assessment.type !== 'ASSIGNMENT') throw AppError.badRequest('Not an assignment')
    if (assessment.status !== 'PUBLISHED') throw AppError.badRequest('Assignment is not published')

    // Check enrollment
    if (assessment.courseId) {
      const enrolled = await prisma.courseEnrollment.findFirst({
        where: { studentId, courseId: assessment.courseId, status: 'ACTIVE' },
      })
      if (!enrolled) throw AppError.forbidden('Not enrolled in this course')
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
    })
    if (existing) return existing

    return prisma.assignmentSubmission.create({
      data: { studentId, assessmentId, courseId: assessment.courseId ?? null },
    })
  },

  async saveDraft(studentId: string, assessmentId: string, content?: string, file?: Express.Multer.File) {
    const submission = await submissionService.getOrCreate(studentId, assessmentId)

    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw AppError.badRequest('Cannot edit a submitted submission')
    }

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content

    if (file) {
      // 1. Validate MIME type against allowlist
      if (!SUBMISSION_ALLOWED_MIME_TYPES.has(file.mimetype)) {
        throw AppError.badRequest(`File type ${file.mimetype} is not allowed for submissions`)
      }

      // 2. Validate magic bytes (file content matches declared MIME)
      if (!validateSubmissionMagicBytes(file.buffer, file.mimetype)) {
        throw AppError.badRequest('File content does not match the declared file type')
      }

      // 3. Size check (multer enforces 20 MB, but double-check)
      if (file.size > SUBMISSION_MAX_SIZE_BYTES) {
        throw AppError.badRequest('File exceeds the 20 MB size limit')
      }

      const ext = submissionExtFromMime(file.mimetype)

      // 4. Upload NEW file to R2 (or local dev fallback)
      let newFileKey: string | null = null
      let newFileUrl: string | null = null

      if (isR2Configured()) {
        // Generate a cryptographically random key — never derived from user input or submission ID
        const randomKey = crypto.randomBytes(24).toString('hex')
        newFileKey = `submissions/${randomKey}.${ext}`
        // Upload new object FIRST; on failure the old file is untouched
        await uploadToR2('submissions-private', file.buffer, file.mimetype, newFileKey)
      } else {
        // Local development fallback — not suitable for production
        const uploadsDir = path.join(process.cwd(), 'uploads', 'submissions')
        fs.mkdirSync(uploadsDir, { recursive: true })
        const filename = `${crypto.randomBytes(16).toString('hex')}.${ext}`
        const filePath = path.join(uploadsDir, filename)
        fs.writeFileSync(filePath, file.buffer)
        newFileUrl = `/uploads/submissions/${filename}`
      }

      // Store key/url in update but do NOT overwrite the existing one yet
      if (newFileKey) {
        updateData.fileKey  = newFileKey
        updateData.fileUrl  = null           // clear legacy local path when R2 key is set
      } else if (newFileUrl) {
        updateData.fileUrl  = newFileUrl
        updateData.fileKey  = null
      }
      updateData.fileName = file.originalname.slice(0, 255) // cap length; original name for display only
      updateData.fileSize = file.size
      updateData.fileType = file.mimetype
    }

    // 5. DB update SECOND — capture old file references before the update
    const oldKey = submission.fileKey
    const oldUrl = submission.fileUrl

    let updated: Awaited<ReturnType<typeof prisma.assignmentSubmission.update>>
    try {
      updated = await prisma.assignmentSubmission.update({
        where: { id: submission.id },
        data: updateData,
      })
    } catch (err) {
      // DB failed — clean up the newly uploaded R2 object so it doesn't become orphaned
      if (file && updateData.fileKey && isR2Configured()) {
        await deleteFromR2(updateData.fileKey as string).catch(() => null)
      } else if (file && updateData.fileUrl && typeof updateData.fileUrl === 'string') {
        const localPath = path.join(process.cwd(), updateData.fileUrl as string)
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
      }
      throw err
    }

    // 6. DB succeeded — now delete the OLD file (best-effort, never on failure path)
    if (file) {
      if (oldKey && isR2Configured()) {
        await deleteFromR2(oldKey).catch(() => null)
      } else if (oldUrl && oldUrl.startsWith('/uploads/submissions/')) {
        const oldPath = path.join(process.cwd(), oldUrl)
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath) } catch { /* best-effort */ }
        }
      }
    }

    return updated
  },

  async submit(studentId: string, assessmentId: string) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
      include: { assessment: { select: { dueDate: true, allowLate: true } } },
    })
    if (!submission) throw AppError.notFound('No draft found — save a draft first')
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw AppError.badRequest('Already submitted')
    }
    if (!submission.content && !submission.fileKey && !submission.fileUrl) {
      throw AppError.badRequest('Submission has no content or file')
    }

    const now = new Date()
    const dueDate = submission.assessment.dueDate
    const isLate  = dueDate && now > dueDate

    if (isLate && !submission.assessment.allowLate) {
      throw AppError.badRequest('Submission deadline has passed')
    }

    return prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status:      isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: now,
      },
    })
  },

  async getMySubmissions(studentId: string) {
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        assessment: {
          select: { id: true, title: true, dueDate: true, totalMarks: true, courseId: true,
            course: { select: { title: true, code: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  },

  async getSubmission(studentId: string, assessmentId: string) {
    // Create draft if none exists so the page always has assessment details
    await submissionService.getOrCreate(studentId, assessmentId)

    return prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
      include: {
        assessment: {
          select: { id: true, title: true, description: true, instructions: true,
            dueDate: true, openDate: true, totalMarks: true, allowLate: true,
            course: { select: { id: true, title: true, code: true } } },
        },
      },
    })
  },

  // ── Secure file download ──────────────────────────────────────────

  async authorizeAndGetDownloadUrl(
    submissionId: string,
    callerId: string,
    callerRole: string,
    callerInstitutionId: string | null,
  ): Promise<{ url: string; fileName: string | null } | { localPath: string; fileName: string | null }> {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assessment: {
          select: { createdBy: true, courseId: true, institutionId: true },
        },
      },
    })
    if (!submission) throw AppError.notFound('Submission not found')

    // Authorization check:
    // Students can only download their own submission
    const isStudent = callerRole === 'STUDENT'
    if (isStudent && submission.studentId !== callerId) {
      throw AppError.forbidden('Access denied')
    }

    // Non-student staff must belong to the same institution as the assessment
    if (!isStudent) {
      const assessmentInstitutionId = submission.assessment.institutionId
      if (assessmentInstitutionId && callerInstitutionId !== assessmentInstitutionId) {
        throw AppError.forbidden('Access denied')
      }
    }

    if (!submission.fileKey && !submission.fileUrl) {
      throw AppError.notFound('This submission has no attached file')
    }

    if (submission.fileKey) {
      if (!isR2Configured()) throw AppError.internal('Storage not configured')
      const url = await generateSignedDownloadUrl(submission.fileKey, SUBMISSION_SIGNED_URL_TTL)
      return { url, fileName: submission.fileName }
    }

    // Legacy local file (backward compat)
    if (submission.fileUrl && submission.fileUrl.startsWith('/uploads/submissions/')) {
      const localPath = path.join(process.cwd(), submission.fileUrl)
      return { localPath, fileName: submission.fileName }
    }

    throw AppError.notFound('File not found')
  },

  // ── Lecturer endpoints ──────────────────────────────────────────

  async getAssignmentSubmissions(assessmentId: string, lecturerId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { createdBy: true, courseId: true },
    })
    if (!assessment) throw AppError.notFound('Assignment not found')
    if (assessment.createdBy !== lecturerId) {
      // Allow HODs/deans/admins — they pass with authorize() guard
    }

    return prisma.assignmentSubmission.findMany({
      where: { assessmentId },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { submittedAt: 'asc' },
    })
  },

  async grade(submissionId: string, graderId: string, grade: number, feedback?: string) {
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assessment: { select: { totalMarks: true } } },
    })
    if (!sub) throw AppError.notFound('Submission not found')
    if (sub.status === 'DRAFT') throw AppError.badRequest('Cannot grade an unsubmitted draft')
    if (grade < 0 || grade > sub.assessment.totalMarks) {
      throw AppError.badRequest(`Grade must be between 0 and ${sub.assessment.totalMarks}`)
    }

    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade, feedback: feedback ?? null, gradedBy: graderId, gradedAt: new Date(), status: 'GRADED' },
    })
  },

  async returnSubmission(submissionId: string, feedback: string) {
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } })
    if (!sub) throw AppError.notFound('Submission not found')

    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { status: 'RETURNED', feedback },
    })
  },
}
