import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, GraduationCap, Sparkles,
  HelpCircle, ClipboardList, Award, CheckSquare, List, Presentation,
  FlaskConical, FolderOpen, Download, BarChart2, Settings, X,
  TrendingUp, Target, Lightbulb, CalendarClock, ClipboardCheck,
  Users, TableProperties, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useSidebar } from '@/contexts/SidebarContext'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MobileNavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

interface MobileNavSection {
  title: string
  items: MobileNavItem[]
}

const NAV: MobileNavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    ],
  },
  {
    title: 'Teaching',
    items: [
      { label: 'Courses', href: ROUTES.COURSES, icon: BookOpen },
      { label: 'Lecture Notes', href: ROUTES.LECTURE_NOTES, icon: FileText },
      { label: 'Teaching Assistant', href: ROUTES.TEACHING_ASSISTANT, icon: GraduationCap },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { label: 'AI Studio', href: ROUTES.AI_STUDIO, icon: Sparkles, badge: 'AI' },
      { label: 'Question Generator', href: ROUTES.QUESTION_GENERATOR, icon: HelpCircle },
      { label: 'Assignment Generator', href: ROUTES.ASSIGNMENT_GENERATOR, icon: ClipboardList },
      { label: 'Exam Builder', href: ROUTES.EXAM_BUILDER, icon: Award },
      { label: 'Rubric Generator', href: ROUTES.RUBRIC_GENERATOR, icon: CheckSquare },
      { label: 'AI Grading Assistant', href: ROUTES.GRADING_ASSISTANT, icon: ClipboardCheck },
      { label: 'AI Marking Assistant', href: ROUTES.MARKING_ASSISTANT, icon: Users },
      { label: 'Mark Sheet Generator', href: ROUTES.MARK_SHEET, icon: TableProperties },
      { label: 'Plagiarism & AI Check', href: ROUTES.PLAGIARISM_CHECK, icon: ShieldCheck },
      { label: 'Course Outline', href: ROUTES.COURSE_OUTLINE, icon: List },
      { label: 'Presentation AI', href: ROUTES.POWERPOINT_GENERATOR, icon: Presentation },
      { label: 'Research Assistant', href: ROUTES.RESEARCH_ASSISTANT, icon: FlaskConical },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Document Library', href: ROUTES.DOCUMENT_LIBRARY, icon: FolderOpen },
      { label: 'Exports', href: ROUTES.EXPORT_CENTER, icon: Download },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', href: ROUTES.ANALYTICS, icon: BarChart2 },
      { label: 'Teaching Analytics', href: ROUTES.ANALYTICS_TEACHING, icon: TrendingUp },
      { label: 'Assessment Analytics', href: ROUTES.ANALYTICS_ASSESSMENTS, icon: Target },
      { label: 'AI Insights', href: ROUTES.AI_INSIGHTS, icon: Lightbulb },
      { label: 'Scheduled Reports', href: ROUTES.SCHEDULED_REPORTS, icon: CalendarClock },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
    ],
  },
]

export function MobileNav() {
  const { mobileOpen, closeMobile } = useSidebar()
  const location = useLocation()

  useEffect(() => { closeMobile() }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMobile() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mobileOpen])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobile}
        aria-hidden
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar border-r border-sidebar-border shadow-2xl transition-transform duration-200 ease-in-out lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div style={{ lineHeight: 1 }}>
            <span style={{
              fontFamily: 'Fraunces, Georgia, serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#0B1E3D',
              letterSpacing: -0.3,
            }}>
              Lecture<span style={{ color: '#3730A3' }}>Craft</span>
            </span>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 8,
              color: '#3730A3',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              UAMSATECH · CRAFT SUITE
            </div>
          </div>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="p-2 space-y-0.5" aria-label="Navigation">
            {NAV.map((section) => (
              <div key={section.title} className="mb-3">
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'mb-0.5 flex h-8 w-full items-center gap-2.5 rounded-lg px-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-sidebar-primary/15 text-sidebar-primary'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4 shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/40')}
                        aria-hidden
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>
    </>
  )
}
