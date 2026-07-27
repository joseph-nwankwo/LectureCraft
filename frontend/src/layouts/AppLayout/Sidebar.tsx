import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, GraduationCap, Sparkles,
  HelpCircle, ClipboardList, Award, CheckSquare, List, Presentation,
  FlaskConical, FolderOpen, Download, BarChart2, Settings,
  ChevronRight, Star, Clock, Search, X, ChevronsLeft, Lightbulb,
  ClipboardCheck, TrendingUp, Target, CalendarClock, Users, TableProperties,
  ShieldCheck,
  GraduationCap as StudentIcon, ClipboardCheck as SubmitIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/app/providers/AuthProvider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  shortcut?: string
  badge?: string | number
  badgeColor?: 'primary' | 'success' | 'warning' | 'error'
  external?: boolean
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
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
      { id: 'mark-sheet',        label: 'Mark Sheet Generator',  href: ROUTES.MARK_SHEET,        icon: TableProperties },
      { id: 'plagiarism-check',  label: 'Plagiarism & AI Check', href: ROUTES.PLAGIARISM_CHECK,  icon: ShieldCheck },
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
      { id: 'analytics',              label: 'Analytics Dashboard',  href: ROUTES.ANALYTICS,             icon: BarChart2 },
      { id: 'analytics-teaching',     label: 'Teaching Analytics',   href: ROUTES.ANALYTICS_TEACHING,    icon: TrendingUp },
      { id: 'analytics-assessments',  label: 'Assessment Analytics', href: ROUTES.ANALYTICS_ASSESSMENTS, icon: Target },
      { id: 'ai-insights',            label: 'AI Insights',          href: ROUTES.AI_INSIGHTS,           icon: Lightbulb },
      { id: 'reports',                label: 'Reports',              href: ROUTES.REPORTS,               icon: FileText },
      { id: 'scheduled-reports',      label: 'Scheduled Reports',    href: ROUTES.SCHEDULED_REPORTS,     icon: CalendarClock },
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

const RECENT_STORAGE_KEY = 'lc-recent-pages'
const FAVORITES_STORAGE_KEY = 'lc-favorites'
const MAX_RECENT = 5

function loadJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback }
  catch { return fallback }
}

const badgeColors = {
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  error: 'bg-error text-white',
}

const STUDENT_NAV: NavSection = {
  id: 'student',
  title: 'My Learning',
  items: [
    { id: 'student-dashboard',  label: 'Dashboard',          href: ROUTES.STUDENT_DASHBOARD,  icon: StudentIcon },
    { id: 'student-courses',    label: 'My Courses',         href: ROUTES.STUDENT_COURSES,    icon: BookOpen },
    { id: 'student-submissions',label: 'My Submissions',     href: ROUTES.STUDENT_SUBMISSIONS, icon: SubmitIcon },
  ],
}

export function Sidebar() {
  const { collapsed, toggle } = useSidebar()
  const { user } = useAuth()
  const location = useLocation()
  const isStudent = user?.roleSlug === 'student'
  const [search, setSearch] = useState('')
  const [favorites, setFavorites] = useState<string[]>(() => loadJson(FAVORITES_STORAGE_KEY, []))
  const [recent, setRecent] = useState<string[]>(() => loadJson(RECENT_STORAGE_KEY, []))
  const [showFavorites, setShowFavorites] = useState(false)

  // Track recent pages
  useEffect(() => {
    const current = location.pathname
    setRecent((prev) => {
      const next = [current, ...prev.filter((p) => p !== current)].slice(0, MAX_RECENT)
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [location.pathname])

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const baseNav   = isStudent ? [STUDENT_NAV] : NAV
  const allItems  = baseNav.flatMap((s) => s.items)

  const filteredNav = search
    ? [{ id: 'search', title: 'Results', items: allItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase())) }]
    : baseNav

  const favoriteItems = allItems.filter((i) => favorites.includes(i.id))
  const recentItems = recent
    .map((href) => allItems.find((i) => i.href === href))
    .filter(Boolean) as NavItem[]

  function isActive(href: string) {
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  return (
    <aside
      data-sidebar
      className={cn(
        'relative hidden lg:flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground pl-8 pr-7 text-xs placeholder:text-sidebar-foreground/40 focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
              aria-label="Search navigation"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0">
        <nav className="p-2 space-y-0.5" role="navigation" aria-label="Main navigation">

          {/* Favorites section */}
          {!collapsed && !search && favoriteItems.length > 0 && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setShowFavorites((v) => !v)}
                className="flex w-full items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <Star className="h-3 w-3" />
                Favorites
              </button>
              {showFavorites && favoriteItems.map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={false} active={isActive(item.href)} onToggleFavorite={toggleFavorite} isFavorite />
              ))}
            </div>
          )}

          {/* Recent pages */}
          {!collapsed && !search && recentItems.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              {recentItems.slice(0, 3).map((item) => (
                <SidebarItem key={item.id} item={item} collapsed={false} active={isActive(item.href)} onToggleFavorite={toggleFavorite} isFavorite={favorites.includes(item.id)} recent />
              ))}
            </div>
          )}

          {/* Main nav sections */}
          {filteredNav.map((section) => (
            <div key={section.id} className={cn(!collapsed && 'mb-3')}>
              {!collapsed && (
                <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  collapsed={collapsed}
                  active={isActive(item.href)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(item.id)}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className={cn('shrink-0 border-t border-sidebar-border p-2', collapsed && 'flex justify-center')}>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'flex h-8 items-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors',
            collapsed ? 'w-8 justify-center' : 'w-full gap-2 px-2'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  item: NavItem
  collapsed: boolean
  active: boolean
  onToggleFavorite: (id: string) => void
  isFavorite: boolean
  recent?: boolean
}

function SidebarItem({ item, collapsed, active, onToggleFavorite, isFavorite, recent }: SidebarItemProps) {
  const Icon = item.icon

  const linkContent = (
    <NavLink
      to={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 transition-all duration-100',
        active
          ? 'bg-white shadow-sm border border-sidebar-border'
          : 'hover:bg-sidebar-accent',
        collapsed && 'justify-center px-0 w-10 mx-auto py-1.5',
        recent && !active && 'opacity-80'
      )}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Circular icon container — ThesisCraft style */}
      <div className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        collapsed ? 'h-8 w-8' : 'h-8 w-8',
        active
          ? 'bg-primary text-white'
          : 'bg-sidebar-foreground/10 text-sidebar-foreground/50 group-hover:bg-sidebar-foreground/15 group-hover:text-sidebar-foreground/70'
      )}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>

      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-medium leading-tight" style={{
            color: active ? '#1a1a2e' : undefined,
          }}>
            {item.label}
          </div>
          {item.badge !== undefined && (
            <span className={cn('mt-0.5 inline-block rounded-full px-1.5 py-0 text-[9px] font-semibold leading-4', badgeColors[item.badgeColor ?? 'primary'])}>
              {item.badge}
            </span>
          )}
        </div>
      )}

      {!collapsed && (
        <div className="flex items-center gap-1 shrink-0">
          {item.shortcut && (
            <kbd className="text-[9px] text-sidebar-foreground/30 font-mono hidden group-hover:inline">
              {item.shortcut}
            </kbd>
          )}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.id) }}
            className={cn(
              'rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
              isFavorite && 'opacity-100 text-warning'
            )}
            aria-label={isFavorite ? `Remove ${item.label} from favorites` : `Add ${item.label} to favorites`}
          >
            <Star className={cn('h-3 w-3', isFavorite ? 'fill-warning text-warning' : 'text-sidebar-foreground/30')} />
          </button>
        </div>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center mb-0.5">{linkContent}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
          {item.label}
          {item.shortcut && <kbd className="text-[10px] text-muted-foreground font-mono">{item.shortcut}</kbd>}
        </TooltipContent>
      </Tooltip>
    )
  }

  return <div className="mb-0.5">{linkContent}</div>
}
