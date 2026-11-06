import {
  Award,
  BarChart2,
  BookOpen,
  CalendarClock,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  List,
  Presentation,
  Settings,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'

export type NavigationRole = 'educator' | 'student'

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  shortcut?: string
  badge?: string | number
  badgeColor?: 'primary' | 'success' | 'warning' | 'error'
}

export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const EDUCATOR_NAV: NavSection[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard, shortcut: '⌘D' },
    ],
  },
  {
    id: 'teaching',
    title: 'Teaching',
    items: [
      { id: 'courses', label: 'Courses', href: ROUTES.COURSES, icon: BookOpen, shortcut: '⌘C' },
      { id: 'lecture-notes', label: 'Lecture Notes', href: ROUTES.LECTURE_NOTES, icon: FileText },
      { id: 'teaching-assistant', label: 'Teaching Assistant', href: ROUTES.TEACHING_ASSISTANT, icon: GraduationCap },
    ],
  },
  {
    id: 'ai-tools',
    title: 'AI Tools',
    items: [
      { id: 'ai-studio', label: 'AI Studio', href: ROUTES.AI_STUDIO, icon: Sparkles, shortcut: '⌘A', badge: 'AI', badgeColor: 'primary' },
      { id: 'question-generator', label: 'Question Generator', href: ROUTES.QUESTION_GENERATOR, icon: HelpCircle },
      { id: 'assignment-generator', label: 'Assignment Generator', href: ROUTES.ASSIGNMENT_GENERATOR, icon: ClipboardList },
      { id: 'exam-builder', label: 'Exam Builder', href: ROUTES.EXAM_BUILDER, icon: Award },
      { id: 'rubric-generator', label: 'Rubric Generator', href: ROUTES.RUBRIC_GENERATOR, icon: CheckSquare },
      { id: 'grading-assistant', label: 'AI Grading Assistant', href: ROUTES.GRADING_ASSISTANT, icon: ClipboardCheck },
      { id: 'marking-assistant', label: 'AI Marking Assistant', href: ROUTES.MARKING_ASSISTANT, icon: Users },
      { id: 'mark-sheet', label: 'Mark Sheet Generator', href: ROUTES.MARK_SHEET, icon: TableProperties },
      { id: 'plagiarism-check', label: 'Plagiarism & AI Check', href: ROUTES.PLAGIARISM_CHECK, icon: ShieldCheck },
      { id: 'course-outline', label: 'Course Outline', href: ROUTES.COURSE_OUTLINE, icon: List },
      { id: 'presentation-ai', label: 'Presentation AI', href: ROUTES.POWERPOINT_GENERATOR, icon: Presentation },
      { id: 'research-assistant', label: 'Research Assistant', href: ROUTES.RESEARCH_ASSISTANT, icon: FlaskConical },
    ],
  },
  {
    id: 'content',
    title: 'Content',
    items: [
      { id: 'document-library', label: 'Document Library', href: ROUTES.DOCUMENT_LIBRARY, icon: FolderOpen },
      { id: 'exports', label: 'Exports', href: ROUTES.EXPORT_CENTER, icon: Download },
    ],
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics Dashboard', href: ROUTES.ANALYTICS, icon: BarChart2 },
      { id: 'analytics-teaching', label: 'Teaching Analytics', href: ROUTES.ANALYTICS_TEACHING, icon: TrendingUp },
      { id: 'analytics-assessments', label: 'Assessment Analytics', href: ROUTES.ANALYTICS_ASSESSMENTS, icon: Target },
      { id: 'ai-insights', label: 'AI Insights', href: ROUTES.AI_INSIGHTS, icon: Lightbulb },
      { id: 'reports', label: 'Reports', href: ROUTES.REPORTS, icon: FileText },
      { id: 'scheduled-reports', label: 'Scheduled Reports', href: ROUTES.SCHEDULED_REPORTS, icon: CalendarClock },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'settings', label: 'Settings', href: ROUTES.SETTINGS, icon: Settings, shortcut: '⌘,' },
    ],
  },
]

const STUDENT_NAV: NavSection[] = [
  {
    id: 'student',
    title: 'My Learning',
    items: [
      { id: 'student-dashboard', label: 'Dashboard', href: ROUTES.STUDENT_DASHBOARD, icon: LayoutDashboard },
      { id: 'student-courses', label: 'My Courses', href: ROUTES.STUDENT_COURSES, icon: BookOpen },
      { id: 'student-submissions', label: 'My Submissions', href: ROUTES.STUDENT_SUBMISSIONS, icon: ClipboardCheck },
    ],
  },
]

export function getNavigationForRole(roleSlug?: string): NavSection[] {
  return roleSlug === 'student' ? STUDENT_NAV : EDUCATOR_NAV
}
