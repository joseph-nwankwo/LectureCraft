import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { analyticsService, type DateRange } from '../services/analytics/analytics.service'

function parseRange(from?: string, to?: string): DateRange | undefined {
  if (!from && !to) return undefined
  const f = from ? new Date(from) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  const t = to ? new Date(to) : new Date()
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return undefined
  return { from: f, to: t }
}

export const analyticsController = {
  // GET /api/analytics/dashboard
  dashboard: asyncHandler(async (req: Request, res: Response) => {
    const { userId, role, institutionId } = req.user!
    const range = parseRange(req.query.from as string, req.query.to as string)
    const department = req.query.department as string | undefined
    const faculty = req.query.faculty as string | undefined

    let data: unknown

    if (role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR') {
      if (!institutionId) throw AppError.forbidden('Institution required')
      data = await analyticsService.getInstitutionDashboard(institutionId, range)
    } else if (role === 'DEAN') {
      if (!institutionId) throw AppError.forbidden('Institution required')
      data = await analyticsService.getFacultyDashboard(institutionId, faculty ?? '', range)
    } else if (role === 'DEPARTMENT_HEAD') {
      if (!institutionId) throw AppError.forbidden('Institution required')
      data = await analyticsService.getDepartmentDashboard(institutionId, department ?? '', range)
    } else {
      data = await analyticsService.getLecturerDashboard(userId, range)
    }

    res.json({ data })
  }),

  // GET /api/analytics/lecturer/:userId
  // Callers may only view their own dashboard unless they hold an admin role.
  lecturerDashboard: asyncHandler(async (req: Request, res: Response) => {
    const { userId, role, institutionId } = req.user!
    const targetId = req.params.userId as string
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'

    if (!isAdmin && targetId !== userId) throw AppError.forbidden('Access denied')
    // Institution-scoped admins may only view lecturers within their institution
    if (isAdmin && institutionId) {
      const { prisma } = await import('../config/database')
      const target = await prisma.user.findFirst({ where: { id: targetId, institutionId } })
      if (!target) throw AppError.forbidden('Access denied')
    }

    const range = parseRange(req.query.from as string, req.query.to as string)
    const data = await analyticsService.getLecturerDashboard(targetId, range)
    res.json({ data })
  }),

  // GET /api/analytics/department
  departmentDashboard: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    const { department } = req.query as { department?: string }
    if (!department) throw AppError.badRequest('department query param required')
    const range = parseRange(req.query.from as string, req.query.to as string)
    const data = await analyticsService.getDepartmentDashboard(institutionId, department, range)
    res.json({ data })
  }),

  // GET /api/analytics/faculty
  facultyDashboard: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    const { faculty } = req.query as { faculty?: string }
    if (!faculty) throw AppError.badRequest('faculty query param required')
    const range = parseRange(req.query.from as string, req.query.to as string)
    const data = await analyticsService.getFacultyDashboard(institutionId, faculty, range)
    res.json({ data })
  }),

  // GET /api/analytics/institution
  institutionDashboard: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    const range = parseRange(req.query.from as string, req.query.to as string)
    const data = await analyticsService.getInstitutionDashboard(institutionId, range)
    res.json({ data })
  }),

  // GET /api/analytics/ai-usage
  aiUsage: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const range = parseRange(req.query.from as string, req.query.to as string)
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR'
    const data = await analyticsService.getAIUsageStats({
      userId: isAdmin ? undefined : userId,
      institutionId: (institutionId ?? undefined),
      range,
    })
    res.json({ data })
  }),

  // GET /api/analytics/documents
  documentStats: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const range = parseRange(req.query.from as string, req.query.to as string)
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'
    const data = await analyticsService.getDocumentStats({
      userId: isAdmin ? undefined : userId,
      institutionId: institutionId ?? undefined,
      range,
    })
    res.json({ data })
  }),

  // GET /api/analytics/assessments
  assessmentStats: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'
    const data = await analyticsService.getAssessmentStats({
      userId: isAdmin ? undefined : userId,
      institutionId: institutionId ?? undefined,
      courseId: req.query.courseId as string | undefined,
    })
    res.json({ data })
  }),

  // GET /api/analytics/approvals
  // Admins see institution-wide stats; lecturers see only their own documents.
  approvalStats: asyncHandler(async (req: Request, res: Response) => {
    const { userId, role, institutionId } = req.user!
    const range = parseRange(req.query.from as string, req.query.to as string)
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR'
    const data = await analyticsService.getApprovalStats({
      institutionId: isAdmin ? (institutionId ?? undefined) : undefined,
      userId:        isAdmin ? undefined : userId,
      range,
    })
    res.json({ data })
  }),

  // GET /api/analytics/bloom
  bloomCoverage: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'
    const data = await analyticsService.getBloomCoverage({
      userId: isAdmin ? undefined : userId,
      institutionId: institutionId ?? undefined,
      courseId: req.query.courseId as string | undefined,
    })
    res.json({ data })
  }),

  // GET /api/analytics/productivity
  productivity: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    const range = parseRange(req.query.from as string, req.query.to as string)
    const data = await analyticsService.getProductivityLeaderboard(institutionId, range)
    res.json({ data })
  }),

  // POST /api/analytics/events
  // Identity fields are sourced from the verified JWT — never from the request
  // body — to prevent clients from logging events under other users' identities.
  trackEvent: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const { eventType, entityType, entityId, courseId, metadata } = req.body as {
      eventType: string
      entityType?: string
      entityId?: string
      courseId?: string
      metadata?: Record<string, unknown>
    }
    await analyticsService.trackEvent({
      eventType, entityType, entityId, courseId, metadata,
      userId,
      institutionId: institutionId ?? undefined,
    })
    res.status(201).json({ ok: true })
  }),
}
