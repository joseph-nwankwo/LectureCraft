import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, ClipboardList, FileText, Download,
  AlertCircle, ExternalLink,
} from 'lucide-react'
import { coursesApi, type CourseDocument, type CourseAssessment, type JoinedCourse } from '@/lib/api/courses.api'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

type Tab = 'notes' | 'assessments'

function typeLabel(t: string) {
  return t.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function assessmentBadgeColor(type: string) {
  switch (type) {
    case 'QUIZ':       return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    case 'EXAM':       return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
    case 'ASSIGNMENT': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    default:           return 'bg-muted text-muted-foreground'
  }
}

function isPast(date: string | null) {
  return date ? new Date(date) < new Date() : false
}

export default function StudentLecturerCourseDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [course, setCourse]         = useState<(JoinedCourse & { user: { name: string; avatarUrl: string | null } }) | null>(null)
  const [docs, setDocs]             = useState<CourseDocument[]>([])
  const [assessments, setAssessments] = useState<CourseAssessment[]>([])
  const [tab, setTab]               = useState<Tab>('notes')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!id) return
    coursesApi.getStudentContent(id)
      .then((data) => {
        setCourse(data.course as typeof course)
        setDocs(data.documents)
        setAssessments(data.assessments)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:px-6 sm:py-8"><Skeleton className="h-10 w-64 rounded-lg" /><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div>
  )

  if (error) return (
    <div className="px-6 py-10">
      <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
        <AlertCircle className="h-4 w-4 shrink-0" /> {error}
      </div>
    </div>
  )

  if (!course) return null

  const openAssessments   = assessments.filter((a) => !isPast(a.dueDate))
  const closedAssessments = assessments.filter((a) => isPast(a.dueDate))

  return (
    <>
      {/* Header */}
      <div className="border-b border-border bg-background px-4 pt-6 sm:px-6">
        <button type="button" onClick={() => navigate(ROUTES.STUDENT_COURSES)}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to my courses
        </button>
        <PageHeader title={course.title} description={course.description ?? undefined} icon={<BookOpen className="h-5 w-5" />} />
        <div className="flex flex-wrap items-center gap-3 pb-6 mt-1">
          {course.code && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{course.code}</span>}
          <span className="text-xs text-muted-foreground">{course.level}</span>
          {course.department && <span className="text-xs text-muted-foreground">{course.department}</span>}
          {course.user?.name && <span className="text-xs text-muted-foreground">Lecturer: {course.user.name}</span>}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {([
            { key: 'notes' as Tab,       label: 'Lecture Notes', icon: <BookOpen className="h-4 w-4" />,    count: docs.length },
            { key: 'assessments' as Tab, label: 'Assessments',   icon: <ClipboardList className="h-4 w-4" />, count: assessments.length },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}>
              {t.icon} {t.label}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Lecture notes */}
        {tab === 'notes' && (
          docs.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No lecture notes posted yet" description="Check back after your lecturer uploads materials" />
          ) : (
            <div className="space-y-3">
              {docs.map((d) => (
                <article key={d.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {typeLabel(d.type)} · {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    {d.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                    )}
                  </div>
                  {d.fileUrl ? (
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 flex items-center gap-1.5 text-xs text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  ) : (
                    <Link
                      to={buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: d.id })}
                      className="shrink-0 flex items-center gap-1.5 text-xs text-primary border border-primary/40 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )
        )}

        {/* Assessments */}
        {tab === 'assessments' && (
          assessments.length === 0 ? (
            <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No assessments posted yet" description="Your lecturer hasn't posted any assignments, quizzes, or tests yet" />
          ) : (
            <div className="space-y-6">
              {openAssessments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Open</p>
                  <div className="space-y-3">
                    {openAssessments.map((a) => (
                      <AssessmentCard key={a.id} assessment={a} badgeColor={assessmentBadgeColor(a.type)} />
                    ))}
                  </div>
                </div>
              )}
              {closedAssessments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past due</p>
                  <div className="space-y-3 opacity-60">
                    {closedAssessments.map((a) => (
                      <AssessmentCard key={a.id} assessment={a} badgeColor={assessmentBadgeColor(a.type)} past />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </>
  )
}

// ── Assessment card ────────────────────────────────────────────────────────────

function AssessmentCard({ assessment: a, badgeColor, past = false }: {
  assessment: CourseAssessment
  badgeColor: string
  past?: boolean
}) {
  return (
    <article className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{a.title}</p>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', badgeColor)}>{a.type}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {a.totalMarks} marks
          {a.durationMins ? ` · ${a.durationMins} min` : ''}
          {a.dueDate && (
            <span className={cn('ml-2', past ? 'text-red-500' : 'text-foreground font-medium')}>
              Due: {new Date(a.dueDate).toLocaleString()}
            </span>
          )}
        </p>
        {a.instructions && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.instructions}</p>
        )}
      </div>
      {!past && (
        <Link
          to={buildRoute(ROUTES.STUDENT_ASSIGNMENT, { assessmentId: a.id })}
          className="shrink-0 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Start
        </Link>
      )}
    </article>
  )
}
