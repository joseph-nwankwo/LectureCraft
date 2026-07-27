# Routes

## Router Config
**File:** `frontend/src/app/router/routes.tsx`
React Router v7, config-based. AppLayout wraps all protected routes. AuthGuard checks login, RoleGuard checks role.

## Route Tree

```
/ (redirect to /dashboard)

Auth (AuthLayout — public):
  /sign-in             → SignInPage
  /sign-up             → SignUpPage
  /forgot-password     → ForgotPasswordPage
  /reset-password      → ResetPasswordPage
  /verify-email        → VerifyEmailPage

App (AuthGuard > AppLayout — protected):
  /dashboard           → DashboardPage              ★ TARGET
  
  Teaching:
  /courses             → CoursesPage
  /courses/new         → CreateCoursePage
  /courses/:id         → CourseDetailPage
  /lecture-notes       → (redirect/listing)
  /teaching-assistant  → TeachingAssistantPage

  AI Engine:
  /ai-studio           → AIStudioPage
  /generate/lecture-notes   → LectureNotesGeneratorPage
  /generate/lesson-plan     → LessonPlanGeneratorPage
  /generate/assignment      → AssignmentGeneratorPage
  /generate/quiz            → QuizGeneratorPage
  /generate/exam            → ExamGeneratorPage
  /generate/marking-scheme  → MarkingSchemeGeneratorPage
  /generate/presentation    → PresentationGeneratorPage
  /generate/course-outline  → CourseOutlineGeneratorPage
  /generate/history         → GenerationHistoryPage
  /generate/documents       → DocumentsPage
  /generate/documents/:id   → DocumentEditorPage
  /generate/templates       → PromptTemplatesPage

  AI Assistants:
  /question-generator  → QuestionGeneratorPage
  /assignment-generator → AssignmentGeneratorPage
  /exam-builder        → ExamGeneratorPage
  /rubric-generator    → RubricsPage
  /grading-assistant   → GradingAssistantPage
  /marking-assistant   → MarkingAssistantPage
  /mark-sheet          → MarkSheetPage
  /plagiarism-check    → PlagiarismCheckPage
  /course-outline      → CourseOutlineGeneratorPage
  /powerpoint-generator → PresentationGeneratorPage
  /research-assistant  → ResearchAssistantPage

  Student Portal:
  /student/dashboard   → StudentDashboardPage
  /student/courses     → MyCoursesPage
  /student/submissions → SubmissionsPage
  /student/assignment/:id → AssignmentSubmitPage

  Content:
  /document-library    → DocumentLibraryPage
  /document-library/trash    → TrashPage
  /document-library/shared   → SharedDocumentsPage
  /document-library/approval → ApprovalQueuePage
  /exports/center      → ExportCenterPage
  /exports             → ExportsPage

  Assessment:
  /question-bank       → QuestionBankPage
  /assessments         → AssessmentListPage
  /assessments/new     → AssessmentBuilderPage
  /rubrics             → RubricsPage
  /learning-outcomes   → LearningOutcomesPage
  /moderation          → ModerationQueuePage

  Analytics:
  /analytics           → AnalyticsDashboardPage
  /analytics/teaching  → TeachingAnalyticsPage
  /analytics/assessments → AssessmentAnalyticsPage
  /ai-insights         → AIInsightsPage
  /reports             → ReportsPage
  /reports/scheduled   → ScheduledReportsPage

  Collaboration:
  /workspaces          → WorkspacesPage
  /workspaces/:id      → WorkspaceDashboardPage
  /messages            → MessagesPage
  /messages/:id        → MessagesPage
  /notifications       → NotificationsPage
  /activity            → ActivityFeedPage
  /calendar            → CalendarPage

  Billing:
  /billing             → BillingPage
  /billing/plans       → PlanComparisonPage
  /billing/invoices    → InvoicesPage
  /billing/payments    → PaymentsPage
  /billing/api-keys    → APIKeysPage
  /billing/usage       → UsageAnalyticsPage
  /billing/admin       → AdminBillingPage
  /billing/coupons     → CouponsPage
  /billing/flags       → FeatureFlagsPage

  Settings (any user):
  /settings            → SettingsPage

  Admin (RoleGuard: university_admin):
  /settings/institution → InstitutionSettingsPage
  /users               → UserManagementPage
  /roles               → RoleManagementPage

  Academic (Phase 5):
  /academic/faculties  → FacultyPage
  /academic/departments → DepartmentPage
  /academic/programmes → ProgrammePage
  /academic/sessions   → AcademicSessionPage
  /academic/semesters  → SemesterPage
  /academic/courses    → AcademicCoursesPage
  /academic/courses/:id → CourseManagePage

  * → NotFoundPage
```

## ROUTES constants
**File:** `frontend/src/constants/routes.ts`

Key routes referenced in components:
- `ROUTES.DASHBOARD` = `/dashboard`
- `ROUTES.AI_STUDIO` = `/ai-studio`
- `ROUTES.COURSES` = `/courses`
- `ROUTES.LECTURE_NOTES` = `/lecture-notes`
- `ROUTES.DOCUMENT_LIBRARY` = `/document-library`
- `ROUTES.EXPORT_CENTER` = `/exports/center`
- `ROUTES.QUESTION_GENERATOR` = `/question-generator`
- `ROUTES.ASSIGNMENT_GENERATOR` = `/assignment-generator`
- `ROUTES.COURSE_CREATE` = `/courses/new`
- `ROUTES.LECTURE_NOTE_GENERATE` = `/generate/lecture-notes`
- `ROUTES.SETTINGS` = `/settings`
