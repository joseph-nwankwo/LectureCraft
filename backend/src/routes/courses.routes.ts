import { Router } from 'express'
import { z } from 'zod'
import { coursesController } from '../controllers/courses.controller'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'

const router = Router()

router.use(authenticate)

const courseSchema = z.object({
  title: z.string().min(1).max(200),
  code: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  level: z.string().min(1),
  credits: z.number().int().min(0).max(20).optional(),
  semester: z.string().optional(),
  academicYear: z.string().optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
})

// ── Specific routes first (before /:id) ───────────────────────────────────────
router.get('/my-joined', authorize('STUDENT'), coursesController.getMyJoined)
router.get('/join/:code', coursesController.getByCode)
router.post('/join/:code', authorize('STUDENT'), coursesController.joinByCode)

// ── Educator CRUD ──────────────────────────────────────────────────────────────
router.get('/', coursesController.list)
router.post('/', validate(courseSchema), coursesController.create)
router.get('/:id', coursesController.get)
router.put('/:id', validate(courseSchema.partial()), coursesController.update)
router.delete('/:id', coursesController.delete)

// ── Educator: enrollment management ───────────────────────────────────────────
router.post('/:id/regenerate-code', coursesController.regenerateCode)
router.get('/:id/students', coursesController.getStudents)

// ── Educator: course content management ───────────────────────────────────────
router.get('/:id/content', coursesController.getCourseContent)
router.post('/:id/content/document', coursesController.publishDocument)
router.post('/:id/content/assessment', coursesController.publishAssessment)
router.delete('/:id/content/document/:docId', coursesController.removeDocument)
router.delete('/:id/content/assessment/:assessmentId', coursesController.removeAssessment)

// ── Student: view published content for a joined course ───────────────────────
router.get('/:id/student-content', authorize('STUDENT'), coursesController.getStudentContent)

export default router
