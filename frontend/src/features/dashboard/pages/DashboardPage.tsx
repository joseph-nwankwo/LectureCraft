import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Sparkles, Cpu, Plus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/app/providers/AuthProvider'
import { WelcomeBanner } from '../components/WelcomeBanner'
import { AIUsageChart, StorageWidget, ProductivityWidget } from '../components/ChartWidgets'
import { Button } from '@/components/design-system/buttons/Button'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { ROUTES } from '@/constants/routes'
import { analyticsApi, type LecturerDashboard } from '@/lib/api/analytics.api'
import { coursesApi } from '@/lib/api/courses.api'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const MINI_STAT_BORDERS: Record<string, string> = {
  primary: 'oklch(0.440 0.058 225)',
  success: 'oklch(0.527 0.154 155.0)',
  warning: 'oklch(0.769 0.188 70.08)',
  default: 'oklch(0.700 0.010 248)',
}

const MINI_STAT_ICON: Record<string, string> = {
  primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  success: 'bg-success/10 text-success group-hover:bg-success group-hover:text-white',
  warning: 'bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white',
  default: 'bg-muted text-muted-foreground',
}

function MiniStatCard({ label, value, icon, color }: {
  label: string
  value: string | number
  icon: ReactNode
  color: 'primary' | 'success' | 'warning' | 'default'
}) {
  return (
    <div
      className="group rounded-xl border border-border border-b-2 bg-card p-4 shadow-card transition-all hover:shadow-hover"
      style={{ borderBottomColor: MINI_STAT_BORDERS[color] }}
    >
      <p className="text-xl font-bold text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded transition-all', MINI_STAT_ICON[color])}>
          {icon}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

const PILL_COLORS: Record<string, string> = {
  primary: 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10',
  success: 'border-success/20 bg-success/5 text-success hover:bg-success/10',
  warning: 'border-warning/20 bg-warning/5 text-warning hover:bg-warning/10',
  default: 'border-border bg-muted/40 text-foreground hover:bg-muted/70',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  if (user?.role === 'STUDENT') return <Navigate to={ROUTES.STUDENT_DASHBOARD} replace />

  const userId    = user?.id ?? ''
  const name      = (user as unknown as { name?: string })?.name ?? ''

  const { data: dash, isLoading: dashLoading } = useQuery<LecturerDashboard>({
    queryKey: ['dashboard', 'lecturer', userId],
    queryFn: () => analyticsApi.getLecturerDashboard(userId) as Promise<LecturerDashboard>,
    enabled: !!userId,
    staleTime: 60_000,
  })

  const { data: coursesRes } = useQuery({
    queryKey: ['courses', 'count'],
    queryFn: () => coursesApi.list({ page: 1, pageSize: 1 } as never),
    staleTime: 60_000,
  })

  const courseCount = (coursesRes as { total?: number })?.total ?? 0
  const summary     = dash?.summary
  const recentDocs  = dash?.recentDocs ?? []

  const quickActions = [
    { id: 'lecture',    label: 'Lecture Note',  icon: <FileText className="h-3.5 w-3.5" />,  color: 'primary' as const,  onClick: () => navigate(ROUTES.LECTURE_NOTE_GENERATE) },
    { id: 'questions',  label: 'Question Set',  icon: <Sparkles className="h-3.5 w-3.5" />,  color: 'success' as const,  onClick: () => navigate(ROUTES.QUESTION_GENERATOR) },
    { id: 'assignment', label: 'Assignment',     icon: <BookOpen className="h-3.5 w-3.5" />,  color: 'warning' as const,  onClick: () => navigate(ROUTES.ASSIGNMENT_GENERATOR) },
    { id: 'course',     label: 'New Course',     icon: <Plus className="h-3.5 w-3.5" />,       color: 'default' as const,  onClick: () => navigate(ROUTES.COURSE_CREATE) },
  ]

  const aiUsageData = (dash?.aiSeries ?? []).map((p) => ({
    date:        new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' }),
    generations: p.value,
    tokens:      p.value * 2,
  }))

  const productivityScore = summary
    ? Math.min(100, Math.round((summary.aiGenerations / Math.max(1, summary.totalDocs)) * 50 + 50))
    : 0

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-6">
      <WelcomeBanner name={name} />

      {/* Pill QuickActions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
              PILL_COLORS[action.color] ?? PILL_COLORS.default
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* 10-col main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">

        {/* Left 6/10: Chart + Recent Activity */}
        <div className="space-y-6 lg:col-span-6">
          {dashLoading
            ? <Skeleton className="h-64 rounded-xl" />
            : <AIUsageChart data={aiUsageData.length ? aiUsageData : []} />
          }

          {/* Recent Documents — slim activity list */}
          <section aria-label="Recent documents">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate(ROUTES.DOCUMENT_LIBRARY)}>
                View all
              </Button>
            </div>
            {dashLoading ? (
              <div className="space-y-2">
                {[1,2,3,4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                No documents yet. Generate your first content from AI Studio.
              </div>
            ) : (
              <div className="space-y-2">
                {recentDocs.slice(0, 5).map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => navigate(`/generate/documents/${doc.id}`)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-px hover:shadow-card"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 4/10: Stats + Widgets */}
        <div className="space-y-6 lg:col-span-4">
          {/* 2×2 mini stat cards */}
          {dashLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <MiniStatCard label="Courses"   value={courseCount}               icon={<BookOpen className="h-3.5 w-3.5" />}  color="primary" />
              <MiniStatCard label="Documents" value={summary?.totalDocs ?? 0}   icon={<FileText className="h-3.5 w-3.5" />}  color="success" />
              <MiniStatCard label="AI Gens"   value={summary?.aiGenerations ?? 0} icon={<Sparkles className="h-3.5 w-3.5" />} color="default" />
              <MiniStatCard label="Tokens"    value={fmt(summary?.tokensUsed ?? 0)} icon={<Cpu className="h-3.5 w-3.5" />}    color="warning" />
            </div>
          )}

          <StorageWidget used={0} total={15} segments={[]} />
          <ProductivityWidget score={productivityScore} trend={0} />
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
