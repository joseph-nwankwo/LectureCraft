import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'
import { notificationService } from '../services/notification/notification.service'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCourseOrFail(courseId: string) {
  const course = await prisma.lecturerCourse.findUnique({ where: { id: courseId } })
  if (!course) throw AppError.notFound('Course not found')
  return course
}

async function assertLecturer(course: { createdBy: string }, userId: string) {
  if (course.createdBy !== userId) throw AppError.forbidden('Only the course lecturer can do this')
}

async function assertAccess(courseId: string, userId: string) {
  const course = await prisma.lecturerCourse.findUnique({ where: { id: courseId } })
  if (!course) throw AppError.notFound('Course not found')
  if (course.createdBy === userId) return course
  const enrollment = await prisma.lecturerCourseEnrollment.findUnique({
    where: { lecturerCourseId_studentId: { lecturerCourseId: courseId, studentId: userId } },
  })
  if (!enrollment || enrollment.status !== 'ACTIVE') throw AppError.forbidden('You are not enrolled in this class')
  return course
}

async function notifyEnrolledStudents(courseId: string, title: string, message: string, actionUrl: string) {
  const enrollments = await prisma.lecturerCourseEnrollment.findMany({
    where: { lecturerCourseId: courseId, status: 'ACTIVE' },
    select: { studentId: true },
  })
  if (enrollments.length === 0) return
  await notificationService.createMany(
    enrollments.map((e) => ({
      userId: e.studentId,
      type: 'INFO' as const,
      category: 'SYSTEM' as const,
      title,
      message,
      actionUrl,
    })),
  )
}

// ── Announcements ─────────────────────────────────────────────────────────────

export const announcementController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    await assertAccess(String(req.params.id), userId)
    const items = await prisma.classAnnouncement.findMany({
      where: { courseId: String(req.params.id) },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    res.json({ status: 'success', data: items })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)

    const { title, content, isPinned } = req.body as { title: string; content: string; isPinned?: boolean }
    if (!title?.trim() || !content?.trim()) throw AppError.badRequest('Title and content are required')

    const item = await prisma.classAnnouncement.create({
      data: { courseId, authorId: userId, title: title.trim(), content: content.trim(), isPinned: isPinned ?? false },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    })

    void notifyEnrolledStudents(
      courseId,
      `New announcement: ${title}`,
      `Your lecturer posted a new announcement in ${course.title}`,
      `/class-connect/${course.enrollCode}`,
    )

    res.status(201).json({ status: 'success', data: item })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)

    const { title, content, isPinned } = req.body as { title?: string; content?: string; isPinned?: boolean }
    const item = await prisma.classAnnouncement.update({
      where: { id: String(req.params.annoId) },
      data: {
        ...(title   ? { title:    title.trim()   } : {}),
        ...(content ? { content:  content.trim() } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    })
    res.json({ status: 'success', data: item })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)
    await prisma.classAnnouncement.delete({ where: { id: String(req.params.annoId) } })
    res.json({ status: 'success' })
  }),
}

// ── Materials (published documents) ──────────────────────────────────────────

export const materialsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    await assertAccess(String(req.params.id), userId)
    const docs = await prisma.document.findMany({
      where: { lecturerCourseId: String(req.params.id) },
      select: {
        id: true, title: true, type: true, status: true,
        fileUrl: true, fileType: true, sizeBytes: true, createdAt: true, updatedAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ status: 'success', data: docs })
  }),
}

// ── Sessions (schedule) ───────────────────────────────────────────────────────

export const sessionController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    await assertAccess(String(req.params.id), userId)
    const items = await prisma.classSession.findMany({
      where: { courseId: String(req.params.id) },
      orderBy: { scheduledAt: 'asc' },
    })
    res.json({ status: 'success', data: items })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)

    const { title, description, scheduledAt, durationMins, location, isOnline, meetLink } =
      req.body as {
        title: string; description?: string; scheduledAt: string
        durationMins?: number; location?: string; isOnline?: boolean; meetLink?: string
      }
    if (!title?.trim() || !scheduledAt) throw AppError.badRequest('Title and scheduledAt are required')

    const item = await prisma.classSession.create({
      data: {
        courseId,
        title:        title.trim(),
        description:  description?.trim(),
        scheduledAt:  new Date(scheduledAt),
        durationMins: durationMins ?? 60,
        location:     location?.trim(),
        isOnline:     isOnline ?? false,
        meetLink:     meetLink?.trim(),
      },
    })

    void notifyEnrolledStudents(
      courseId,
      `Class scheduled: ${title}`,
      `A new class session has been added to ${course.title}`,
      `/class-connect/${course.enrollCode}`,
    )

    res.status(201).json({ status: 'success', data: item })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)
    await prisma.classSession.delete({ where: { id: String(req.params.sessionId) } })
    res.json({ status: 'success' })
  }),
}

// ── Polls ─────────────────────────────────────────────────────────────────────

export const pollController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const isLecturer = course.createdBy === userId

    const polls = await prisma.classPoll.findMany({
      where: { courseId },
      include: {
        responses: isLecturer
          ? { select: { studentId: true, selectedOption: true } }
          : { where: { studentId: userId }, select: { selectedOption: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ status: 'success', data: polls })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)

    const { question, options, expiresAt } =
      req.body as { question: string; options: string[]; expiresAt?: string }
    if (!question?.trim()) throw AppError.badRequest('Question is required')
    if (!Array.isArray(options) || options.length < 2) throw AppError.badRequest('At least 2 options required')

    const item = await prisma.classPoll.create({
      data: {
        courseId,
        createdBy: userId,
        question:  question.trim(),
        options,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    })

    void notifyEnrolledStudents(
      courseId,
      `New poll: ${question}`,
      `Your lecturer started a poll in ${course.title}. Share your response!`,
      `/class-connect/${course.enrollCode}`,
    )

    res.status(201).json({ status: 'success', data: item })
  }),

  respond: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const courseId  = String(req.params.id)
    await assertAccess(courseId, studentId)

    const poll = await prisma.classPoll.findUnique({ where: { id: String(req.params.pollId) } })
    if (!poll) throw AppError.notFound('Poll not found')
    if (!poll.isActive) throw AppError.badRequest('This poll is closed')
    if (poll.expiresAt && poll.expiresAt < new Date()) throw AppError.badRequest('This poll has expired')

    const { selectedOption } = req.body as { selectedOption: number }
    const opts = poll.options as string[]
    if (selectedOption < 0 || selectedOption >= opts.length) throw AppError.badRequest('Invalid option')

    const response = await prisma.classPollResponse.upsert({
      where:  { pollId_studentId: { pollId: poll.id, studentId } },
      create: { pollId: poll.id, studentId, selectedOption },
      update: { selectedOption },
    })
    res.json({ status: 'success', data: response })
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)
    const item = await prisma.classPoll.update({
      where: { id: String(req.params.pollId) },
      data:  { isActive: false },
    })
    res.json({ status: 'success', data: item })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)
    await prisma.classPoll.delete({ where: { id: String(req.params.pollId) } })
    res.json({ status: 'success' })
  }),
}

// ── Assignments ───────────────────────────────────────────────────────────────

export const assignmentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const isLecturer = course.createdBy === userId

    const assignments = await prisma.classAssignment.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } },
        ...(isLecturer ? {} : {
          submissions: { where: { studentId: userId }, select: { grade: true, feedback: true, submittedAt: true, submissionUrl: true, textContent: true } },
        }),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
    res.json({ status: 'success', data: assignments })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)

    const { title, description, dueDate, totalMarks, attachmentUrl } =
      req.body as { title: string; description?: string; dueDate?: string; totalMarks?: number; attachmentUrl?: string }
    if (!title?.trim()) throw AppError.badRequest('Title is required')

    const item = await prisma.classAssignment.create({
      data: {
        courseId, createdBy: userId,
        title:         title.trim(),
        description:   description?.trim(),
        dueDate:       dueDate ? new Date(dueDate) : undefined,
        totalMarks:    totalMarks ?? undefined,
        attachmentUrl: attachmentUrl?.trim(),
      },
      include: { _count: { select: { submissions: true } } },
    })

    void notifyEnrolledStudents(
      courseId,
      `New assignment: ${title}`,
      `A new assignment has been posted in ${course.title}${dueDate ? ` — due ${new Date(dueDate).toLocaleDateString()}` : ''}`,
      `/class-connect/${course.id}`,
    )

    res.status(201).json({ status: 'success', data: item })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)

    const { title, description, dueDate, totalMarks, attachmentUrl } =
      req.body as { title?: string; description?: string; dueDate?: string | null; totalMarks?: number | null; attachmentUrl?: string | null }

    const item = await prisma.classAssignment.update({
      where: { id: String(req.params.assignmentId) },
      data: {
        ...(title         !== undefined ? { title:         title.trim()             } : {}),
        ...(description   !== undefined ? { description:   description?.trim()      } : {}),
        ...(dueDate       !== undefined ? { dueDate:       dueDate ? new Date(dueDate) : null } : {}),
        ...(totalMarks    !== undefined ? { totalMarks                               } : {}),
        ...(attachmentUrl !== undefined ? { attachmentUrl: attachmentUrl?.trim()    } : {}),
      },
      include: { _count: { select: { submissions: true } } },
    })
    res.json({ status: 'success', data: item })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)
    await prisma.classAssignment.delete({ where: { id: String(req.params.assignmentId) } })
    res.json({ status: 'success' })
  }),

  listSubmissions: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)

    const submissions = await prisma.classAssignmentSubmission.findMany({
      where: { assignmentId: String(req.params.assignmentId) },
      include: { student: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { submittedAt: 'asc' },
    })
    res.json({ status: 'success', data: submissions })
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    const studentId    = req.user!.userId
    const courseId     = String(req.params.id)
    const assignmentId = String(req.params.assignmentId)
    await assertAccess(courseId, studentId)

    const assignment = await prisma.classAssignment.findUnique({ where: { id: assignmentId } })
    if (!assignment) throw AppError.notFound('Assignment not found')

    const { submissionUrl, textContent } = req.body as { submissionUrl?: string; textContent?: string }
    if (!submissionUrl?.trim() && !textContent?.trim()) throw AppError.badRequest('Provide a submission URL or text')

    const submission = await prisma.classAssignmentSubmission.upsert({
      where:  { assignmentId_studentId: { assignmentId, studentId } },
      create: { assignmentId, studentId, submissionUrl: submissionUrl?.trim(), textContent: textContent?.trim() },
      update: { submissionUrl: submissionUrl?.trim(), textContent: textContent?.trim(), submittedAt: new Date() },
    })
    res.json({ status: 'success', data: submission })
  }),

  grade: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const course = await getCourseOrFail(String(req.params.id))
    await assertLecturer(course, userId)

    const { grade, feedback } = req.body as { grade: number; feedback?: string }
    if (grade === undefined || grade === null) throw AppError.badRequest('Grade is required')

    const submission = await prisma.classAssignmentSubmission.update({
      where: { id: String(req.params.submissionId) },
      data:  { grade, feedback: feedback?.trim(), gradedBy: userId, gradedAt: new Date() },
      include: { student: { select: { id: true, name: true } } },
    })

    void notificationService.create({
      userId:    submission.student.id,
      type:      'SUCCESS' as const,
      category:  'SYSTEM' as const,
      title:     'Assignment graded',
      message:   `Your submission for "${course.title}" has been graded: ${grade}`,
      actionUrl: `/class-connect/${String(req.params.id)}`,
    })

    res.json({ status: 'success', data: submission })
  }),
}

// ── Attendance ────────────────────────────────────────────────────────────────

export const attendanceController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const isLecturer = course.createdBy === userId

    if (isLecturer) {
      const records = await prisma.classAttendanceRecord.findMany({
        where: { courseId },
        include: {
          entries: { include: { student: { select: { id: true, name: true, avatarUrl: true } } } },
        },
        orderBy: { date: 'desc' },
      })
      res.json({ status: 'success', data: records })
    } else {
      const entries = await prisma.attendanceEntry.findMany({
        where: { studentId: userId, record: { courseId } },
        include: { record: { select: { date: true } } },
        orderBy: { record: { date: 'desc' } },
      })
      res.json({ status: 'success', data: entries })
    }
  }),

  save: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)

    const { date, entries } = req.body as {
      date: string
      entries: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' }[]
    }
    if (!date) throw AppError.badRequest('Date is required')
    if (!Array.isArray(entries) || entries.length === 0) throw AppError.badRequest('Entries are required')

    const parsedDate = new Date(date)

    const record = await prisma.classAttendanceRecord.upsert({
      where:  { courseId_date: { courseId, date: parsedDate } },
      create: { courseId, date: parsedDate, createdBy: userId },
      update: {},
    })

    await prisma.$transaction(
      entries.map((e) =>
        prisma.attendanceEntry.upsert({
          where:  { recordId_studentId: { recordId: record.id, studentId: e.studentId } },
          create: { recordId: record.id, studentId: e.studentId, status: e.status },
          update: { status: e.status },
        }),
      ),
    )

    const saved = await prisma.classAttendanceRecord.findUnique({
      where:   { id: record.id },
      include: { entries: { include: { student: { select: { id: true, name: true, avatarUrl: true } } } } },
    })
    res.json({ status: 'success', data: saved })
  }),
}

// ── Discussion Board ──────────────────────────────────────────────────────────

const THREAD_INCLUDE = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { replies: true } },
} as const

export const discussionController = {
  listThreads: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    await assertAccess(courseId, userId)
    const threads = await prisma.classDiscussionThread.findMany({
      where:   { courseId },
      include: THREAD_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    res.json({ status: 'success', data: threads })
  }),

  createThread: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const { title, body } = req.body as { title: string; body: string }
    if (!title?.trim() || !body?.trim()) throw AppError.badRequest('Title and body are required')

    const thread = await prisma.classDiscussionThread.create({
      data:    { courseId, authorId: userId, title: title.trim(), body: body.trim() },
      include: THREAD_INCLUDE,
    })

    if (course.createdBy !== userId) {
      void notificationService.create({
        userId:    course.createdBy,
        type:      'INFO' as const,
        category:  'SYSTEM' as const,
        title:     `New discussion: ${title.trim()}`,
        message:   `A student posted a question in ${course.title}`,
        actionUrl: `/courses/lc/${course.id}`,
      })
    }

    res.status(201).json({ status: 'success', data: thread })
  }),

  deleteThread: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const thread   = await prisma.classDiscussionThread.findUnique({ where: { id: String(req.params.threadId) } })
    if (!thread) throw AppError.notFound('Thread not found')
    if (thread.authorId !== userId && course.createdBy !== userId) throw AppError.forbidden('Not allowed')
    await prisma.classDiscussionThread.delete({ where: { id: thread.id } })
    res.json({ status: 'success' })
  }),

  getReplies: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    await assertAccess(courseId, userId)
    const replies = await prisma.classDiscussionReply.findMany({
      where:   { threadId: String(req.params.threadId) },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ status: 'success', data: replies })
  }),

  reply: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    await assertAccess(courseId, userId)
    const thread = await prisma.classDiscussionThread.findUnique({ where: { id: String(req.params.threadId) } })
    if (!thread) throw AppError.notFound('Thread not found')
    const { body } = req.body as { body: string }
    if (!body?.trim()) throw AppError.badRequest('Reply body is required')

    const reply = await prisma.classDiscussionReply.create({
      data:    { threadId: thread.id, authorId: userId, body: body.trim() },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    })

    if (thread.authorId !== userId) {
      void notificationService.create({
        userId:    thread.authorId,
        type:      'INFO' as const,
        category:  'SYSTEM' as const,
        title:     'New reply on your discussion',
        message:   `Someone replied to "${thread.title}"`,
        actionUrl: `/class-connect/${courseId}`,
      })
    }

    res.status(201).json({ status: 'success', data: reply })
  }),

  deleteReply: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const reply    = await prisma.classDiscussionReply.findUnique({ where: { id: String(req.params.replyId) } })
    if (!reply) throw AppError.notFound('Reply not found')
    if (reply.authorId !== userId && course.createdBy !== userId) throw AppError.forbidden('Not allowed')
    await prisma.classDiscussionReply.delete({ where: { id: reply.id } })
    res.json({ status: 'success' })
  }),

  pin: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await getCourseOrFail(courseId)
    await assertLecturer(course, userId)
    const thread = await prisma.classDiscussionThread.findUnique({ where: { id: String(req.params.threadId) } })
    if (!thread) throw AppError.notFound('Thread not found')
    const updated = await prisma.classDiscussionThread.update({
      where:   { id: thread.id },
      data:    { isPinned: !thread.isPinned },
      include: THREAD_INCLUDE,
    })
    res.json({ status: 'success', data: updated })
  }),

  resolve: asyncHandler(async (req: Request, res: Response) => {
    const userId   = req.user!.userId
    const courseId = String(req.params.id)
    const course   = await assertAccess(courseId, userId)
    const thread   = await prisma.classDiscussionThread.findUnique({ where: { id: String(req.params.threadId) } })
    if (!thread) throw AppError.notFound('Thread not found')
    if (thread.authorId !== userId && course.createdBy !== userId) throw AppError.forbidden('Not allowed')
    const updated = await prisma.classDiscussionThread.update({
      where:   { id: thread.id },
      data:    { isResolved: !thread.isResolved },
      include: THREAD_INCLUDE,
    })
    res.json({ status: 'success', data: updated })
  }),
}
