import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Sparkles, Cpu, Plus, ArrowRight } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { WelcomeBanner } from '../components/WelcomeBanner'
import { AIUsageChart, StorageWidget, ProductivityWidget } from '../components/ChartWidgets'
import { Button } from '@/components/design-system/buttons/Button'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton, SkeletonStatCard } from '@/components/design-system/feedback/Skeleton'
import { StatCard } from '@/components/design-system/cards/StatCard'
import { ROUTES } from '@/constants/routes'
import { analyticsApi, type LecturerDashboard } from '@/lib/api/analytics.api'
import { coursesApi } from '@/lib/api/courses.api'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const isStudent = user?.role === 'student'
  const userId    = user?.id ?? ''
  const name      = (user as unknown as { name?: string })?.name ?? ''

  const { data: dash, isLoading: dashLoading } = useQuery<LecturerDashboard>({
    queryKey: ['dashboard', 'lecturer', userId],
    queryFn: () => analyticsApi.getLecturerDashboard(userId) as Promise<LecturerDashboard>,
    enabled: !!userId && !isStudent,
    staleTime: 60_000,
  })

  const { data: coursesRes } = useQuery({
    queryKey: ['courses', 'count'],
    queryFn: () => coursesApi.list({ page: 1, pageSize: 1 } as never),
    enabled: !isStudent,
    staleTime: 60_000,
  })

  if (isStudent) return <Navigate to={ROUTES.STUDENT_DASHBOARD} replace />

  const courseCount = (coursesRes as { total?: number })?.total ?? 0
  const summary     = dash?.summary
  const recentDocs  = dash?.recentDocs ?? []

  const quickActions = [
    { id: 'lecture',    label: 'Lecture Note',  icon: <FileText className="h-3.5 w-3.5" />,  variant: 'primary' as const,  onClick: () => navigate(ROUTES.LECTURE_NOTE_GENERATE) },
    { id: 'questions',  label: 'Question Set',  icon: <Sparkles className="h-3.5 w-3.5" />,  variant: 'success' as const,  onClick: () => navigate(ROUTES.QUESTION_GENERATOR) },
    { id: 'assignment', label: 'Assignment',     icon: <BookOpen className="h-3.5 w-3.5" />,  variant: 'accent' as const,   onClick: () => navigate(ROUTES.ASSIGNMENT_GENERATOR) },
    { id: 'course',     label: 'New Course',     icon: <Plus className="h-3.5 w-3.5" />,       variant: 'outline' as const, onClick: () => navigate(ROUTES.COURSE_CREATE) },
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
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
      <WelcomeBanner name={name} />

      <div className="flex flex-wrap gap-2" aria-label="Quick actions">
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant}
            size="sm"
            onClick={action.onClick}
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <section aria-label="Dashboard statistics">
        {dashLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Courses" value={courseCount} icon={<BookOpen className="h-4 w-4" />} color="primary" />
            <StatCard label="Documents" value={summary?.totalDocs ?? 0} icon={<FileText className="h-4 w-4" />} color="success" />
            <StatCard label="AI Generations" value={summary?.aiGenerations ?? 0} icon={<Sparkles className="h-4 w-4" />} color="default" />
            <StatCard label="Tokens" value={fmt(summary?.tokensUsed ?? 0)} icon={<Cpu className="h-4 w-4" />} color="warning" />
          </div>
        )}
      </section>

      {/* 10-col main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">

        {/* Left 6/10: Chart + Recent Activity */}
        <div className="space-y-6 lg:col-span-6">
          <AIUsageChart data={aiUsageData.length ? aiUsageData : []} loading={dashLoading} />

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
              <EmptyState
                icon={<FileText className="h-5 w-5" />}
                title="No documents yet"
                description="Generate your first content from AI Studio."
                size="sm"
              />
            ) : (
              <div className="space-y-2">
                {recentDocs.slice(0, 5).map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => navigate(`/generate/documents/${doc.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:-translate-y-px hover:shadow-card"
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
          <StorageWidget used={0} total={15} segments={[]} />
          <ProductivityWidget score={productivityScore} trend={0} />
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
