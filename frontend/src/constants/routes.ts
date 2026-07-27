export const ROUTES = {
  // Public
  HOME: '/',
  SIGN_IN: '/sign-in',
  AUTH_SSO: '/auth/sso',
  SIGN_UP: '/sign-up',
  STUDENT_SIGN_UP: '/sign-up/student',
  EDUCATOR_SIGN_UP: '/sign-up/educator',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // App
  DASHBOARD: '/dashboard',

  // Courses
  COURSES: '/courses',
  COURSE_DETAIL: '/courses/:id',
  COURSE_CREATE: '/courses/new',
  COURSE_EDIT: '/courses/:id/edit',

  // AI Document Engine (Phase 6)
  AI_STUDIO:           '/ai-studio',
  GEN_LECTURE_NOTES:   '/generate/lecture-notes',
  GEN_LESSON_PLAN:     '/generate/lesson-plan',
  GEN_ASSIGNMENT:      '/generate/assignment',
  GEN_QUIZ:            '/generate/quiz',
  GEN_EXAM:            '/generate/exam',
  GEN_MARKING_SCHEME:  '/generate/marking-scheme',
  GEN_PRESENTATION:    '/generate/presentation',
  GEN_COURSE_OUTLINE:  '/generate/course-outline',
  GEN_HISTORY:         '/generate/history',
  GEN_DOCUMENTS:       '/generate/documents',
  GEN_DOCUMENT_DETAIL: '/generate/documents/:id',
  GEN_TEMPLATES:       '/generate/templates',

  // Legacy content routes (kept for sidebar compat)
  LECTURE_NOTES: '/generate/lecture-notes',
  LECTURE_NOTE_GENERATE: '/generate/lecture-notes',
  LECTURE_NOTE_DETAIL: '/generate/documents/:id',
  QUESTION_GENERATOR: '/question-generator',
  ASSIGNMENT_GENERATOR: '/generate/assignment',
  EXAM_BUILDER: '/generate/exam',
  RUBRIC_GENERATOR: '/generate/marking-scheme',
  COURSE_OUTLINE: '/generate/course-outline',
  POWERPOINT_GENERATOR: '/generate/presentation',

  // Student Portal
  STUDENT_DASHBOARD:    '/student',
  STUDENT_COURSES:      '/student/courses',
  STUDENT_LC_DETAIL:    '/student/courses/lc/:id',
  STUDENT_SUBMISSIONS:  '/student/submissions',
  STUDENT_ASSIGNMENT:   '/student/assignment/:assessmentId',

  // Standalone educator course detail
  LC_COURSE_DETAIL: '/courses/lc/:id',

  // AI Assistants
  TEACHING_ASSISTANT:  '/teaching-assistant',
  RESEARCH_ASSISTANT:  '/research-assistant',
  GRADING_ASSISTANT:   '/grading-assistant',
  MARKING_ASSISTANT:   '/marking-assistant',
  MARK_SHEET:          '/mark-sheet',
  PLAGIARISM_CHECK:    '/plagiarism-check',

  // Library & Analytics
  DOCUMENT_LIBRARY: '/library',
  LIBRARY_TRASH:    '/library/trash',
  LIBRARY_SHARED:   '/library/shared',
  APPROVAL_QUEUE:   '/library/approvals',
  EXPORT_CENTER:    '/library/exports',

  // Document management (Phase 7)
  DOCUMENT_EDITOR:      '/documents/:id/edit',
  DOCUMENT_COMPARISON:  '/documents/:id/compare',
  VERSION_TIMELINE:     '/documents/:id/versions',

  // Assessment & Question Bank (Phase 8)
  QUESTION_BANK:       '/assessment/questions',
  QUESTION_EDITOR:     '/assessment/questions/:id',
  ASSESSMENT_LIST:     '/assessment',
  ASSESSMENT_BUILDER:  '/assessment/builder/:id',
  RUBRICS:             '/assessment/rubrics',
  LEARNING_OUTCOMES:   '/assessment/outcomes',
  MODERATION_QUEUE:    '/assessment/moderation',

  // Analytics & Reporting (Phase 9)
  ANALYTICS:              '/analytics',
  ANALYTICS_TEACHING:     '/analytics/teaching',
  ANALYTICS_ASSESSMENTS:  '/analytics/assessments',
  AI_INSIGHTS:            '/analytics/insights',
  REPORTS:                '/analytics/reports',
  SCHEDULED_REPORTS:      '/analytics/scheduled',

  EXPORTS: '/exports',

  // Settings
  SETTINGS: '/settings',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_AI: '/settings/ai-providers',
  SETTINGS_NOTIFICATIONS: '/settings/notifications',
  SETTINGS_APPEARANCE: '/settings/appearance',
  SETTINGS_INSTITUTION: '/settings/institution',

  // Administration
  USER_MANAGEMENT: '/admin/users',
  ROLE_MANAGEMENT: '/admin/roles',

  // Billing & Subscriptions (Phase 10)
  BILLING:              '/billing',
  BILLING_PLANS:        '/billing/plans',
  BILLING_INVOICES:     '/billing/invoices',
  BILLING_PAYMENTS:     '/billing/payments',
  BILLING_API_KEYS:     '/billing/api-keys',
  BILLING_USAGE:        '/billing/usage',
  BILLING_ADMIN:        '/billing/admin',
  BILLING_COUPONS:      '/billing/admin/coupons',
  BILLING_FLAGS:        '/billing/admin/flags',

  // Collaboration & Communication (Phase 11)
  WORKSPACES:            '/workspaces',
  WORKSPACE_DASHBOARD:   '/workspaces/:id',
  MESSAGES:              '/messages',
  CONVERSATION:          '/messages/:conversationId',
  NOTIFICATIONS:         '/notifications',
  ACTIVITY_FEED:         '/activity',
  CALENDAR:              '/calendar',

  // Academic Structure (Phase 5)
  ACADEMIC_FACULTIES:   '/academic/faculties',
  ACADEMIC_DEPARTMENTS: '/academic/departments',
  ACADEMIC_PROGRAMMES:  '/academic/programmes',
  ACADEMIC_SESSIONS:    '/academic/sessions',
  ACADEMIC_SEMESTERS:   '/academic/semesters',
  ACADEMIC_COURSES:     '/academic/courses',
  ACADEMIC_COURSE_DETAIL: '/academic/courses/:id',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function buildRoute(route: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value),
    route
  )
}
