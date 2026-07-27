import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { AuthGuard } from './guards/AuthGuard'
import { RoleGuard } from './guards/RoleGuard'
import { ROUTES } from '@/constants/routes'

// ──────────────── Lazy-loaded pages ────────────────

// Auth
const SignInPage          = lazy(() => import('@/features/auth/pages/SignInPage'))
const SignUpPage          = lazy(() => import('@/features/auth/pages/SignUpPage'))
const StudentSignUpPage   = lazy(() => import('@/features/auth/pages/StudentSignUpPage'))
const EducatorSignUpPage  = lazy(() => import('@/features/auth/pages/EducatorSignUpPage'))
const ForgotPasswordPage  = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage   = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const VerifyEmailPage     = lazy(() => import('@/features/auth/pages/VerifyEmailPage'))
const SsoPage             = lazy(() => import('@/features/auth/pages/SsoPage'))

// Errors
const NotFoundPage        = lazy(() => import('@/pages/errors/NotFoundPage'))

// App shell
const AppLayout           = lazy(() => import('@/layouts/AppLayout/AppLayout'))
const AuthLayout          = lazy(() => import('@/layouts/AuthLayout/AuthLayout'))

// Dashboard
const DashboardPage       = lazy(() => import('@/features/dashboard/pages/DashboardPage'))

// Courses
const CoursesPage                 = lazy(() => import('@/features/courses/pages/CoursesPage'))
const CourseDetailPage            = lazy(() => import('@/features/courses/pages/CourseDetailPage'))
const CreateCoursePage            = lazy(() => import('@/features/courses/pages/CreateCoursePage'))
const LecturerCourseDetailPage    = lazy(() => import('@/features/courses/pages/LecturerCourseDetailPage'))

// AI Document Engine (Phase 6)
const AIStudioPage              = lazy(() => import('@/features/ai-engine/pages/AIStudioPage'))
const LectureNotesGeneratorPage = lazy(() => import('@/features/ai-engine/pages/LectureNotesGeneratorPage'))
const LessonPlanGeneratorPage   = lazy(() => import('@/features/ai-engine/pages/LessonPlanGeneratorPage'))
const AssignmentGeneratorPage   = lazy(() => import('@/features/ai-engine/pages/AssignmentGeneratorPage'))
const QuizGeneratorPage         = lazy(() => import('@/features/ai-engine/pages/QuizGeneratorPage'))
const ExamGeneratorPage         = lazy(() => import('@/features/ai-engine/pages/ExamGeneratorPage'))
const MarkingSchemeGeneratorPage= lazy(() => import('@/features/ai-engine/pages/MarkingSchemeGeneratorPage'))
const PresentationGeneratorPage = lazy(() => import('@/features/ai-engine/pages/PresentationGeneratorPage'))
const CourseOutlineGeneratorPage= lazy(() => import('@/features/ai-engine/pages/CourseOutlineGeneratorPage'))
const GenerationHistoryPage     = lazy(() => import('@/features/ai-engine/pages/GenerationHistoryPage'))
const DocumentsPage             = lazy(() => import('@/features/ai-engine/pages/DocumentsPage'))
const DocumentEditorPage        = lazy(() => import('@/features/ai-engine/pages/DocumentEditorPage'))
const PromptTemplatesPage       = lazy(() => import('@/features/ai-engine/pages/PromptTemplatesPage'))

// Student Portal
const StudentDashboardPage           = lazy(() => import('@/features/student/pages/StudentDashboardPage'))
const MyCoursesPage                  = lazy(() => import('@/features/student/pages/MyCoursesPage'))
const SubmissionsPage                = lazy(() => import('@/features/student/pages/SubmissionsPage'))
const AssignmentSubmitPage           = lazy(() => import('@/features/student/pages/AssignmentSubmitPage'))
const StudentLecturerCourseDetailPage = lazy(() => import('@/features/student/pages/LecturerCourseDetailPage'))

// AI Assistants
const TeachingAssistantPage  = lazy(() => import('@/features/teaching-assistant/pages/TeachingAssistantPage'))
const ResearchAssistantPage  = lazy(() => import('@/features/research-assistant/pages/ResearchAssistantPage'))
const GradingAssistantPage   = lazy(() => import('@/features/grading-assistant/pages/GradingAssistantPage'))
const MarkingAssistantPage   = lazy(() => import('@/features/marking-assistant/pages/MarkingAssistantPage'))
const MarkSheetPage          = lazy(() => import('@/features/mark-sheet/pages/MarkSheetPage'))
const PlagiarismCheckPage    = lazy(() => import('@/features/plagiarism/pages/PlagiarismCheckPage'))

// Question Generator Studio
const QuestionGeneratorPage  = lazy(() => import('@/features/question-generator/pages/QuestionGeneratorPage'))

// Analytics, Reporting & Intelligence (Phase 9)
const AnalyticsDashboardPage  = lazy(() => import('@/features/analytics/pages/AnalyticsDashboardPage').then(m => ({ default: m.AnalyticsDashboardPage })))
const TeachingAnalyticsPage   = lazy(() => import('@/features/analytics/pages/TeachingAnalyticsPage').then(m => ({ default: m.TeachingAnalyticsPage })))
const AssessmentAnalyticsPage = lazy(() => import('@/features/analytics/pages/AssessmentAnalyticsPage').then(m => ({ default: m.AssessmentAnalyticsPage })))
const AIInsightsPage          = lazy(() => import('@/features/analytics/pages/AIInsightsPage').then(m => ({ default: m.AIInsightsPage })))
const ReportsPage             = lazy(() => import('@/features/analytics/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const ScheduledReportsPage    = lazy(() => import('@/features/analytics/pages/ScheduledReportsPage').then(m => ({ default: m.ScheduledReportsPage })))

// Billing & Subscriptions (Phase 10)
const BillingPage             = lazy(() => import('@/features/billing/pages/BillingPage'))
const PlanComparisonPage      = lazy(() => import('@/features/billing/pages/PlanComparisonPage'))
const InvoicesPage            = lazy(() => import('@/features/billing/pages/InvoicesPage'))
const PaymentsPage            = lazy(() => import('@/features/billing/pages/PaymentsPage'))
const APIKeysPage             = lazy(() => import('@/features/billing/pages/APIKeysPage'))
const UsageAnalyticsPage      = lazy(() => import('@/features/billing/pages/UsageAnalyticsPage'))
const AdminBillingPage        = lazy(() => import('@/features/billing/pages/AdminBillingPage'))
const CouponsPage             = lazy(() => import('@/features/billing/pages/CouponsPage'))
const FeatureFlagsPage        = lazy(() => import('@/features/billing/pages/FeatureFlagsPage'))

// Legacy
const ExportsPage            = lazy(() => import('@/features/exports/pages/ExportsPage'))

// Assessment & Question Bank (Phase 8)
const QuestionBankPage       = lazy(() => import('@/features/assessment/pages/QuestionBankPage').then(m => ({ default: m.QuestionBankPage })))
const QuestionEditorPage     = lazy(() => import('@/features/assessment/pages/QuestionEditorPage').then(m => ({ default: m.QuestionEditorPage })))
const AssessmentListPage     = lazy(() => import('@/features/assessment/pages/AssessmentListPage').then(m => ({ default: m.AssessmentListPage })))
const AssessmentBuilderPage  = lazy(() => import('@/features/assessment/pages/AssessmentBuilderPage').then(m => ({ default: m.AssessmentBuilderPage })))
const RubricsPage            = lazy(() => import('@/features/assessment/pages/RubricsPage').then(m => ({ default: m.RubricsPage })))
const LearningOutcomesPage   = lazy(() => import('@/features/assessment/pages/LearningOutcomesPage').then(m => ({ default: m.LearningOutcomesPage })))
const ModerationQueuePage    = lazy(() => import('@/features/assessment/pages/ModerationQueuePage').then(m => ({ default: m.ModerationQueuePage })))

// Document Management & Library (Phase 7)
const DocumentLibraryPage    = lazy(() => import('@/features/library/pages/DocumentLibraryPage').then(m => ({ default: m.DocumentLibraryPage })))
const TrashPage              = lazy(() => import('@/features/library/pages/TrashPage').then(m => ({ default: m.TrashPage })))
const SharedDocumentsPage    = lazy(() => import('@/features/library/pages/SharedDocumentsPage').then(m => ({ default: m.SharedDocumentsPage })))
const ApprovalQueuePage      = lazy(() => import('@/features/library/pages/ApprovalQueuePage').then(m => ({ default: m.ApprovalQueuePage })))
const ExportCenterPage       = lazy(() => import('@/features/library/pages/ExportCenterPage').then(m => ({ default: m.ExportCenterPage })))
const DocumentComparisonPage = lazy(() => import('@/features/library/pages/DocumentComparisonPage').then(m => ({ default: m.DocumentComparisonPage })))
const VersionTimelinePage    = lazy(() => import('@/features/library/pages/VersionTimelinePage').then(m => ({ default: m.VersionTimelinePage })))

// Collaboration & Communication (Phase 11)
const WorkspacesPage         = lazy(() => import('@/features/collaboration/pages/WorkspacesPage'))
const WorkspaceDashboardPage = lazy(() => import('@/features/collaboration/pages/WorkspaceDashboardPage'))
const MessagesPage           = lazy(() => import('@/features/collaboration/pages/MessagesPage'))
const NotificationsPage      = lazy(() => import('@/features/collaboration/pages/NotificationsPage'))
const ActivityFeedPage       = lazy(() => import('@/features/collaboration/pages/ActivityFeedPage'))
const CalendarPage           = lazy(() => import('@/features/collaboration/pages/CalendarPage'))

// Settings & Administration
const SettingsPage            = lazy(() => import('@/features/settings/pages/SettingsPage'))
const InstitutionSettingsPage = lazy(() => import('@/features/settings/pages/InstitutionSettingsPage'))
const UserManagementPage      = lazy(() => import('@/features/users/pages/UserManagementPage'))
const RoleManagementPage      = lazy(() => import('@/features/users/pages/RoleManagementPage'))

// Academic Structure (Phase 5)
const FacultyPage         = lazy(() => import('@/features/academic/pages/FacultyPage'))
const DepartmentPage      = lazy(() => import('@/features/academic/pages/DepartmentPage'))
const ProgrammePage       = lazy(() => import('@/features/academic/pages/ProgrammePage'))
const AcademicSessionPage = lazy(() => import('@/features/academic/pages/AcademicSessionPage'))
const SemesterPage        = lazy(() => import('@/features/academic/pages/SemesterPage'))
const AcademicCoursesPage = lazy(() => import('@/features/academic/pages/AcademicCoursesPage'))
const CourseManagePage    = lazy(() => import('@/features/academic/pages/CourseManagePage'))

// ──────────────── Route tree ────────────────

export const routes: RouteObject[] = [
  // SSO callback — no layout wrapper, handles its own redirect
  { path: ROUTES.AUTH_SSO, element: <SsoPage /> },

  // Auth routes (unauthenticated)
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.SIGN_IN,          element: <SignInPage /> },
      { path: ROUTES.SIGN_UP,          element: <SignUpPage /> },
      { path: ROUTES.STUDENT_SIGN_UP,  element: <StudentSignUpPage /> },
      { path: ROUTES.EDUCATOR_SIGN_UP, element: <EducatorSignUpPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: ROUTES.RESET_PASSWORD,  element: <ResetPasswordPage /> },
      { path: ROUTES.VERIFY_EMAIL,    element: <VerifyEmailPage /> },
    ],
  },

  // Protected app routes
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, path: ROUTES.DASHBOARD, element: <DashboardPage /> },

          // Courses
          { path: ROUTES.COURSES,            element: <CoursesPage /> },
          { path: ROUTES.COURSE_CREATE,      element: <CreateCoursePage /> },
          { path: ROUTES.LC_COURSE_DETAIL,   element: <LecturerCourseDetailPage /> },
          { path: ROUTES.COURSE_DETAIL,      element: <CourseDetailPage /> },

          // AI Document Engine — hub
          { path: ROUTES.AI_STUDIO, element: <AIStudioPage /> },

          // AI Generators
          { path: ROUTES.GEN_LECTURE_NOTES,  element: <LectureNotesGeneratorPage /> },
          { path: ROUTES.GEN_LESSON_PLAN,    element: <LessonPlanGeneratorPage /> },
          { path: ROUTES.GEN_ASSIGNMENT,     element: <AssignmentGeneratorPage /> },
          { path: ROUTES.GEN_QUIZ,           element: <QuizGeneratorPage /> },
          { path: ROUTES.GEN_EXAM,           element: <ExamGeneratorPage /> },
          { path: ROUTES.GEN_MARKING_SCHEME, element: <MarkingSchemeGeneratorPage /> },
          { path: ROUTES.GEN_PRESENTATION,   element: <PresentationGeneratorPage /> },
          { path: ROUTES.GEN_COURSE_OUTLINE, element: <CourseOutlineGeneratorPage /> },

          // Documents & history
          { path: ROUTES.GEN_HISTORY,         element: <GenerationHistoryPage /> },
          { path: ROUTES.GEN_DOCUMENTS,        element: <DocumentsPage /> },
          { path: ROUTES.GEN_DOCUMENT_DETAIL,  element: <DocumentEditorPage /> },
          { path: ROUTES.GEN_TEMPLATES,        element: <PromptTemplatesPage /> },

          // Student Portal
          {
            element: <RoleGuard requiredRole="student" exact />,
            children: [
              { path: ROUTES.STUDENT_DASHBOARD,   element: <StudentDashboardPage /> },
              { path: ROUTES.STUDENT_COURSES,     element: <MyCoursesPage /> },
              { path: ROUTES.STUDENT_LC_DETAIL,   element: <StudentLecturerCourseDetailPage /> },
              { path: ROUTES.STUDENT_SUBMISSIONS, element: <SubmissionsPage /> },
              { path: ROUTES.STUDENT_ASSIGNMENT,  element: <AssignmentSubmitPage /> },
            ],
          },

          // AI Assistants
          { path: ROUTES.TEACHING_ASSISTANT,  element: <TeachingAssistantPage /> },
          { path: ROUTES.RESEARCH_ASSISTANT,  element: <ResearchAssistantPage /> },
          { path: ROUTES.GRADING_ASSISTANT,   element: <GradingAssistantPage /> },
          { path: ROUTES.MARKING_ASSISTANT,   element: <MarkingAssistantPage /> },
          { path: ROUTES.MARK_SHEET,         element: <MarkSheetPage /> },
          { path: ROUTES.PLAGIARISM_CHECK,   element: <PlagiarismCheckPage /> },
          { path: ROUTES.QUESTION_GENERATOR,  element: <QuestionGeneratorPage /> },

          // Document Library (Phase 7)
          { path: ROUTES.DOCUMENT_LIBRARY, element: <DocumentLibraryPage /> },
          { path: ROUTES.LIBRARY_TRASH,    element: <TrashPage /> },
          { path: ROUTES.LIBRARY_SHARED,   element: <SharedDocumentsPage /> },
          { path: ROUTES.APPROVAL_QUEUE,   element: <ApprovalQueuePage /> },
          { path: ROUTES.EXPORT_CENTER,    element: <ExportCenterPage /> },

          // Document actions (Phase 7)
          { path: ROUTES.DOCUMENT_COMPARISON, element: <DocumentComparisonPage /> },
          { path: ROUTES.VERSION_TIMELINE,    element: <VersionTimelinePage /> },

          // Assessment & Question Bank (Phase 8)
          { path: ROUTES.QUESTION_BANK,      element: <QuestionBankPage /> },
          { path: ROUTES.QUESTION_EDITOR,    element: <QuestionEditorPage /> },
          { path: ROUTES.ASSESSMENT_LIST,    element: <AssessmentListPage /> },
          { path: ROUTES.ASSESSMENT_BUILDER, element: <AssessmentBuilderPage /> },
          { path: ROUTES.RUBRICS,            element: <RubricsPage /> },
          { path: ROUTES.LEARNING_OUTCOMES,  element: <LearningOutcomesPage /> },
          { path: ROUTES.MODERATION_QUEUE,   element: <ModerationQueuePage /> },

          // Analytics, Reporting & Intelligence (Phase 9)
          { path: ROUTES.ANALYTICS,             element: <AnalyticsDashboardPage /> },
          { path: ROUTES.ANALYTICS_TEACHING,    element: <TeachingAnalyticsPage /> },
          { path: ROUTES.ANALYTICS_ASSESSMENTS, element: <AssessmentAnalyticsPage /> },
          { path: ROUTES.AI_INSIGHTS,           element: <AIInsightsPage /> },
          { path: ROUTES.REPORTS,               element: <ReportsPage /> },
          { path: ROUTES.SCHEDULED_REPORTS,     element: <ScheduledReportsPage /> },

          { path: ROUTES.EXPORTS,   element: <ExportsPage /> },

          // Collaboration & Communication (Phase 11)
          { path: ROUTES.WORKSPACES,          element: <WorkspacesPage /> },
          { path: ROUTES.WORKSPACE_DASHBOARD, element: <WorkspaceDashboardPage /> },
          { path: ROUTES.MESSAGES,            element: <MessagesPage /> },
          { path: ROUTES.CONVERSATION,        element: <MessagesPage /> },
          { path: ROUTES.NOTIFICATIONS,       element: <NotificationsPage /> },
          { path: ROUTES.ACTIVITY_FEED,       element: <ActivityFeedPage /> },
          { path: ROUTES.CALENDAR,            element: <CalendarPage /> },

          // Billing & Subscriptions (Phase 10)
          { path: ROUTES.BILLING,          element: <BillingPage /> },
          { path: ROUTES.BILLING_PLANS,    element: <PlanComparisonPage /> },
          { path: ROUTES.BILLING_INVOICES, element: <InvoicesPage /> },
          { path: ROUTES.BILLING_PAYMENTS, element: <PaymentsPage /> },
          { path: ROUTES.BILLING_API_KEYS, element: <APIKeysPage /> },
          { path: ROUTES.BILLING_USAGE,    element: <UsageAnalyticsPage /> },
          { path: ROUTES.BILLING_ADMIN,    element: <AdminBillingPage /> },
          { path: ROUTES.BILLING_COUPONS,  element: <CouponsPage /> },
          { path: ROUTES.BILLING_FLAGS,    element: <FeatureFlagsPage /> },

          // Personal settings (any authenticated user)
          { path: ROUTES.SETTINGS, element: <SettingsPage /> },

          // Admin routes
          {
            element: <RoleGuard requiredRole="university_admin" />,
            children: [
              { path: ROUTES.SETTINGS_INSTITUTION, element: <InstitutionSettingsPage /> },
              { path: ROUTES.USER_MANAGEMENT,      element: <UserManagementPage /> },
              { path: ROUTES.ROLE_MANAGEMENT,      element: <RoleManagementPage /> },
            ],
          },

          // Academic Structure (Phase 5)
          { path: ROUTES.ACADEMIC_FACULTIES,     element: <FacultyPage /> },
          { path: ROUTES.ACADEMIC_DEPARTMENTS,   element: <DepartmentPage /> },
          { path: ROUTES.ACADEMIC_PROGRAMMES,    element: <ProgrammePage /> },
          { path: ROUTES.ACADEMIC_SESSIONS,      element: <AcademicSessionPage /> },
          { path: ROUTES.ACADEMIC_SEMESTERS,     element: <SemesterPage /> },
          { path: ROUTES.ACADEMIC_COURSES,       element: <AcademicCoursesPage /> },
          { path: ROUTES.ACADEMIC_COURSE_DETAIL, element: <CourseManagePage /> },
        ],
      },
    ],
  },

  // Fallback 404
  { path: '*', element: <NotFoundPage /> },
]
