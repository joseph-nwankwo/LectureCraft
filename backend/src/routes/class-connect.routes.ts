import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import {
  announcementController, materialsController, sessionController,
  pollController, assignmentController, attendanceController, discussionController,
} from '../controllers/class-connect.controller'

const router = Router()

router.use(authenticate)

// ── Announcements ─────────────────────────────────────────────────────────────
router.get   ('/courses/:id/announcements',               announcementController.list)
router.post  ('/courses/:id/announcements',               announcementController.create)
router.patch ('/courses/:id/announcements/:annoId',       announcementController.update)
router.delete('/courses/:id/announcements/:annoId',       announcementController.delete)

// ── Materials ─────────────────────────────────────────────────────────────────
router.get   ('/courses/:id/materials',                   materialsController.list)

// ── Sessions (schedule) ───────────────────────────────────────────────────────
router.get   ('/courses/:id/sessions',                    sessionController.list)
router.post  ('/courses/:id/sessions',                    sessionController.create)
router.delete('/courses/:id/sessions/:sessionId',         sessionController.delete)

// ── Polls ─────────────────────────────────────────────────────────────────────
router.get   ('/courses/:id/polls',                       pollController.list)
router.post  ('/courses/:id/polls',                       pollController.create)
router.post  ('/courses/:id/polls/:pollId/respond',       pollController.respond)
router.patch ('/courses/:id/polls/:pollId/close',         pollController.close)
router.delete('/courses/:id/polls/:pollId',               pollController.delete)

// ── Assignments ───────────────────────────────────────────────────────────────
router.get   ('/courses/:id/assignments',                                   assignmentController.list)
router.post  ('/courses/:id/assignments',                                   assignmentController.create)
router.patch ('/courses/:id/assignments/:assignmentId',                     assignmentController.update)
router.delete('/courses/:id/assignments/:assignmentId',                     assignmentController.delete)
router.get   ('/courses/:id/assignments/:assignmentId/submissions',         assignmentController.listSubmissions)
router.post  ('/courses/:id/assignments/:assignmentId/submit',              assignmentController.submit)
router.patch ('/courses/:id/assignments/:assignmentId/submissions/:submissionId/grade', assignmentController.grade)

// ── Attendance ────────────────────────────────────────────────────────────────
router.get   ('/courses/:id/attendance',                                    attendanceController.list)
router.post  ('/courses/:id/attendance',                                    attendanceController.save)

// ── Discussion Board ──────────────────────────────────────────────────────────
router.get   ('/courses/:id/discussions',                                              discussionController.listThreads)
router.post  ('/courses/:id/discussions',                                              discussionController.createThread)
router.delete('/courses/:id/discussions/:threadId',                                    discussionController.deleteThread)
router.get   ('/courses/:id/discussions/:threadId/replies',                            discussionController.getReplies)
router.post  ('/courses/:id/discussions/:threadId/replies',                            discussionController.reply)
router.delete('/courses/:id/discussions/:threadId/replies/:replyId',                   discussionController.deleteReply)
router.patch ('/courses/:id/discussions/:threadId/pin',                                discussionController.pin)
router.patch ('/courses/:id/discussions/:threadId/resolve',                            discussionController.resolve)

export default router
