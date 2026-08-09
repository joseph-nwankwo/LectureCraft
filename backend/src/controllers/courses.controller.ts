import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'
import { notificationService } from '../services/notification/notification.service'
import { emailService } from '../services/email/email.service'
import { env } from '../config/env'

const qs = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lc  = () => (prisma as any).lecturerCourse as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lce = () => (prisma as any).lecturerCourseEnrollment as any

function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = genCode()
    const exists = await lc().findUnique({ where: { enrollCode: code } })
    if (!exists) return code
  }
  throw new Error('Failed to generate unique enroll code')
}

export const coursesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page     = Math.max(1, parseInt(qs(req.query.page) ?? '1'))
    const pageSize = Math.min(100, parseInt(qs(req.query.pageSize) ?? '20'))
    const search   = qs(req.query.search)
    const skip     = (page - 1) * pageSize
    const createdBy = req.user!.userId

    const where = {
      createdBy,
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [courses, count] = await Promise.all([
      lc().findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: pageSize }),
      lc().count({ where }),
    ])

    res.json({
      status: 'success',
      data: courses,
      count,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id     = String(req.params.id)
    const course = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()
    res.json({ status: 'success', course })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const {
      title, code, description, level, credits,
      semester, academicYear, department, faculty,
    } = req.body as {
      title: string; code?: string; description?: string; level: string
      credits?: number; semester?: string; academicYear?: string
      department?: string; faculty?: string
    }

    const enrollCode = await uniqueCode()

    const course = await lc().create({
      data: {
        createdBy:    req.user!.userId,
        title,
        code:         code         || null,
        description:  description  || null,
        level,
        credits:      credits      ? Number(credits) : null,
        semester:     semester     || null,
        academicYear: academicYear || null,
        department:   department   || null,
        faculty:      faculty      || null,
        enrollCode,
      },
    })
    res.status(201).json({ status: 'success', course })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const existing = await lc().findUnique({ where: { id } })
    if (!existing) throw AppError.notFound('Course')
    if (existing.createdBy !== req.user!.userId) throw AppError.forbidden()

    const {
      title, code, description, level, credits,
      semester, academicYear, department, faculty,
    } = req.body as {
      title?: string; code?: string; description?: string; level?: string
      credits?: number; semester?: string; academicYear?: string
      department?: string; faculty?: string
    }

    const course = await lc().update({
      where: { id },
      data: {
        ...(title        !== undefined && { title }),
        ...(code         !== undefined && { code:         code         || null }),
        ...(description  !== undefined && { description:  description  || null }),
        ...(level        !== undefined && { level }),
        ...(credits      !== undefined && { credits:      credits ? Number(credits) : null }),
        ...(semester     !== undefined && { semester:     semester     || null }),
        ...(academicYear !== undefined && { academicYear: academicYear || null }),
        ...(department   !== undefined && { department:   department   || null }),
        ...(faculty      !== undefined && { faculty:      faculty      || null }),
      },
    })
    res.json({ status: 'success', course })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const existing = await lc().findUnique({ where: { id } })
    if (!existing) throw AppError.notFound('Course')
    if (existing.createdBy !== req.user!.userId) throw AppError.forbidden()

    await lc().delete({ where: { id } })
    res.json({ status: 'success', message: 'Course deleted' })
  }),

  // ── Enroll code management (educator) ─────────────────────────────────────

  regenerateCode: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const existing = await lc().findUnique({ where: { id } })
    if (!existing) throw AppError.notFound('Course')
    if (existing.createdBy !== req.user!.userId) throw AppError.forbidden()

    const enrollCode = await uniqueCode()
    const course = await lc().update({ where: { id }, data: { enrollCode } })
    res.json({ status: 'success', course })
  }),

  // ── Student: preview course by join code ──────────────────────────────────

  getByCode: asyncHandler(async (req: Request, res: Response) => {
    const code   = String(req.params.code).toUpperCase()
    const course = await lc().findUnique({
      where: { enrollCode: code },
      select: {
        id: true, title: true, code: true, description: true,
        level: true, department: true, faculty: true, enrollCode: true,
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { enrollments: true } },
      },
    })
    if (!course) throw AppError.notFound('No course found with that code')
    res.json({ status: 'success', course })
  }),

  // ── Student: join course by code ──────────────────────────────────────────

  joinByCode: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const code      = String(req.params.code).toUpperCase()

    const course = await lc().findUnique({
      where: { enrollCode: code },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!course) throw AppError.notFound('No course found with that code')
    if (course.createdBy === studentId) throw AppError.badRequest('You cannot join your own course')

    const existing = await lce().findUnique({
      where: { lecturerCourseId_studentId: { lecturerCourseId: course.id, studentId } },
    })
    if (existing) {
      if (existing.status === 'ACTIVE') throw AppError.conflict('Already enrolled in this course')
      const updated = await lce().update({
        where: { id: existing.id },
        data: { status: 'ACTIVE' },
      })
      return res.json({ status: 'success', enrollment: updated })
    }

    const [enrollment, student] = await Promise.all([
      lce().create({ data: { lecturerCourseId: course.id, studentId } }),
      prisma.user.findUnique({ where: { id: studentId }, select: { name: true } }),
    ])

    // Fire-and-forget — don't block the join response
    const studentName = student?.name ?? 'A student'
    const lecturer    = course.user as { id: string; name: string; email: string }
    const courseUrl   = `${env.FRONTEND_URL}/courses/${course.id}`

    void notificationService.create({
      userId:   lecturer.id,
      type:     'INFO',
      category: 'SYSTEM',
      title:    'New student joined your class',
      message:  `${studentName} joined ${course.title} via Class Connect`,
      actionUrl: courseUrl,
    })

    void emailService.sendStudentJoined({
      to:          lecturer.email,
      lecturerName: lecturer.name,
      studentName,
      courseTitle: course.title as string,
      courseCode:  course.code as string | null,
      courseUrl,
    })

    res.status(201).json({ status: 'success', enrollment })
  }),

  // ── Educator: list students enrolled in a course ──────────────────────────

  getStudents: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const course   = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    const enrollments = await lce().findMany({
      where: { lecturerCourseId: id, status: 'ACTIVE' },
      include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { enrolledAt: 'asc' },
    })
    res.json({ status: 'success', data: enrollments })
  }),

  // ── Educator: get all content (docs + assessments) for a course ──────────

  getCourseContent: asyncHandler(async (req: Request, res: Response) => {
    const id     = String(req.params.id)
    const course = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    const [documents, assessments] = await Promise.all([
      prisma.document.findMany({
        where: { lecturerCourseId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, status: true, fileUrl: true, fileType: true, sizeBytes: true, description: true, createdAt: true },
      }),
      prisma.assessment.findMany({
        where: { lecturerCourseId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, status: true, totalMarks: true, durationMins: true, dueDate: true, openDate: true, instructions: true, createdAt: true },
      }),
    ])

    res.json({ status: 'success', data: { documents, assessments } })
  }),

  // ── Educator: publish a document to a course ──────────────────────────────

  publishDocument: asyncHandler(async (req: Request, res: Response) => {
    const courseId   = String(req.params.id)
    const documentId = String(req.body.documentId)

    const course = await lc().findUnique({ where: { id: courseId } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    const doc = await prisma.document.findUnique({ where: { id: documentId } })
    if (!doc) throw AppError.notFound('Document')
    if (doc.userId !== req.user!.userId) throw AppError.forbidden()

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { lecturerCourseId: courseId },
    })

    // Notify all enrolled students
    const enrollments = await lce().findMany({ where: { lecturerCourseId: courseId, status: 'ACTIVE' } })
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e: { studentId: string }) => ({
          userId:   e.studentId,
          type:     'DOCUMENT_GENERATED',
          category: 'DOCUMENTS',
          title:    `New material in ${course.title}`,
          message:  `Your lecturer posted: ${doc.title}`,
          data:     { lecturerCourseId: courseId, documentId },
        })),
      })
    }

    res.json({ status: 'success', document: updated })
  }),

  // ── Educator: publish an assessment to a course ───────────────────────────

  publishAssessment: asyncHandler(async (req: Request, res: Response) => {
    const courseId     = String(req.params.id)
    const assessmentId = String(req.body.assessmentId)

    const course = await lc().findUnique({ where: { id: courseId } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } })
    if (!assessment) throw AppError.notFound('Assessment')
    if (assessment.createdBy !== req.user!.userId) throw AppError.forbidden()

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: { lecturerCourseId: courseId },
    })

    // Notify all enrolled students
    const enrollments = await lce().findMany({ where: { lecturerCourseId: courseId, status: 'ACTIVE' } })
    if (enrollments.length > 0) {
      const typeLabel = assessment.type.charAt(0) + assessment.type.slice(1).toLowerCase()
      const due       = assessment.dueDate ? ` — due ${new Date(assessment.dueDate).toLocaleDateString()}` : ''
      await prisma.notification.createMany({
        data: enrollments.map((e: { studentId: string }) => ({
          userId:   e.studentId,
          type:     'INFO',
          category: 'DOCUMENTS',
          title:    `New ${typeLabel} in ${course.title}`,
          message:  `${assessment.title} has been posted${due}`,
          data:     { lecturerCourseId: courseId, assessmentId },
        })),
      })
    }

    res.json({ status: 'success', assessment: updated })
  }),

  // ── Educator: remove a document from a course ─────────────────────────────

  removeDocument: asyncHandler(async (req: Request, res: Response) => {
    const id     = String(req.params.id)
    const docId  = String(req.params.docId)
    const course = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    await prisma.document.update({ where: { id: docId }, data: { lecturerCourseId: null } })
    res.json({ status: 'success' })
  }),

  // ── Educator: remove an assessment from a course ──────────────────────────

  removeAssessment: asyncHandler(async (req: Request, res: Response) => {
    const id           = String(req.params.id)
    const assessmentId = String(req.params.assessmentId)
    const course       = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()

    await prisma.assessment.update({ where: { id: assessmentId }, data: { lecturerCourseId: null } })
    res.json({ status: 'success' })
  }),

  // ── Student: get published content for an enrolled course ─────────────────

  getStudentContent: asyncHandler(async (req: Request, res: Response) => {
    const courseId  = String(req.params.id)
    const studentId = req.user!.userId

    const enrollment = await lce().findUnique({
      where: { lecturerCourseId_studentId: { lecturerCourseId: courseId, studentId } },
    })
    if (!enrollment || enrollment.status !== 'ACTIVE') throw AppError.forbidden()

    const course = await lc().findUnique({
      where: { id: courseId },
      include: { user: { select: { name: true, avatarUrl: true } } },
    })
    if (!course) throw AppError.notFound('Course')

    const [documents, assessments] = await Promise.all([
      prisma.document.findMany({
        where: { lecturerCourseId: courseId, status: 'PUBLISHED', isTrashed: false },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, fileUrl: true, fileType: true, sizeBytes: true, description: true, createdAt: true },
      }),
      prisma.assessment.findMany({
        where: { lecturerCourseId: courseId, status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, type: true, totalMarks: true, durationMins: true, dueDate: true, openDate: true, instructions: true, createdAt: true },
      }),
    ])

    res.json({ status: 'success', data: { course, documents, assessments } })
  }),

  // ── Student: list all joined lecturer courses ─────────────────────────────

  getMyJoined: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId

    const enrollments = await lce().findMany({
      where: { studentId, status: 'ACTIVE' },
      include: {
        course: {
          select: {
            id: true, title: true, code: true, description: true, level: true,
            department: true, faculty: true, semester: true, academicYear: true,
            enrollCode: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    })

    const data = enrollments.map((e: { course: unknown; enrolledAt: Date; status: string }) => ({
      ...(e.course as Record<string, unknown>),
      enrolledAt: (e.enrolledAt as Date).toISOString(),
      enrollmentStatus: e.status,
      isLecturerCourse: true,
    }))

    res.json({ status: 'success', data })
  }),
}
