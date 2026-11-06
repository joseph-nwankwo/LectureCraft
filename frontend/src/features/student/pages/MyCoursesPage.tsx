import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, CheckCircle, Plus, Loader2, Search, AlertCircle, Hash, X, ArrowRight } from 'lucide-react'
import { enrollmentApi, type CourseBasic, type EnrolledCourse } from '@/lib/api/student.api'
import { coursesApi, type JoinedCourse } from '@/lib/api/courses.api'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

type Tab = 'enrolled' | 'available'

function levelLabel(l: string) {
  return l.replace('_', ' ').replace('L', 'Level ')
}

// ── Join-code modal ────────────────────────────────────────────────────────────

interface JoinModalProps { onClose: () => void; onJoined: () => void }

function JoinModal({ onClose, onJoined }: JoinModalProps) {
  const [code, setCode]       = useState('')
  const [preview, setPreview] = useState<{ title: string; user: { name: string } } | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState('')

  async function handleLookup() {
    if (code.trim().length < 4) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const course = await coursesApi.getByCode(code.trim())
      setPreview(course)
    } catch {
      setError('No course found with that code. Check and try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      await coursesApi.joinByCode(code.trim())
      onJoined()
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Join with code</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Enter the 6-character code your lecturer shared with you.
        </p>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setPreview(null); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleLookup() }}
              placeholder="ABC123"
              maxLength={6}
              className="w-full pl-8 pr-3 py-2 text-sm font-mono border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase tracking-widest"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={loading || code.trim().length < 4}
            className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Look up'}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {preview && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-foreground">{preview.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">by {preview.user.name}</p>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={!preview || joining}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {joining && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Join Course
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MyCoursesPage() {
  const navigate = useNavigate()
  const [tab, setTab]               = useState<Tab>('enrolled')
  const [enrolled, setEnrolled]     = useState<EnrolledCourse[]>([])
  const [joined, setJoined]         = useState<JoinedCourse[]>([])
  const [available, setAvailable]   = useState<(CourseBasic & { enrolled: boolean })[]>([])
  const [loading, setLoading]       = useState(true)
  const [enrolling, setEnrolling]   = useState<string | null>(null)
  const [dropping, setDropping]     = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState('')
  const [showJoin, setShowJoin]     = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [e, a, j] = await Promise.all([
        enrollmentApi.getMy(),
        enrollmentApi.getAvailable(),
        coursesApi.getMyJoined(),
      ])
      setEnrolled(e)
      setAvailable(a)
      setJoined(j)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId)
    try {
      await enrollmentApi.enroll(courseId)
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setEnrolling(null) }
  }

  async function handleDrop(courseId: string) {
    if (!confirm('Drop this course?')) return
    setDropping(courseId)
    try {
      await enrollmentApi.drop(courseId)
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setDropping(null) }
  }

  const q = search.toLowerCase()
  const filteredEnrolled  = enrolled.filter((c) => `${c.title} ${c.code}`.toLowerCase().includes(q))
  const filteredJoined    = joined.filter((c) => `${c.title} ${c.code ?? ''}`.toLowerCase().includes(q))
  const filteredAvailable = available.filter((c) => `${c.title} ${c.code}`.toLowerCase().includes(q))

  const totalEnrolled = enrolled.length + joined.length

  return (
    <>
      <div className="border-b border-border bg-background px-4 pt-6 sm:px-6"><PageHeader title="My Courses" description="Browse and manage your course enrollments" icon={<BookOpen className="h-5 w-5" />} /></div>

      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Tabs + Search + Join button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex gap-0 border-b border-border">
            {(['enrolled', 'available'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-5 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {t === 'enrolled' ? `Enrolled (${totalEnrolled})` : `Available (${available.filter((c) => !c.enrolled).length})`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowJoin(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Hash className="h-3.5 w-3.5" />
              Join with code
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses…"
                className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-44"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>
        ) : tab === 'enrolled' ? (
          filteredEnrolled.length === 0 && filteredJoined.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="Not enrolled in any courses yet"
              description="Browse available courses or join with a code."
              size="lg"
              action={<button type="button" onClick={() => setTab('available')} className="text-sm text-primary hover:underline">Browse available courses</button>}
              secondaryAction={<button type="button" onClick={() => setShowJoin(true)} className="text-sm text-primary hover:underline">Join with a code</button>}
            />
          ) : (
            <div className="space-y-6">
              {/* Institutional courses */}
              {filteredEnrolled.length > 0 && (
                <div>
                  {filteredJoined.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Institution Courses</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredEnrolled.map((c) => (
                      <article key={c.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-foreground">{c.title}</p>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{c.code}</span>
                          </div>
                          {c.department?.name && (
                            <p className="text-xs text-muted-foreground mt-1">{c.department.name} · {levelLabel(c.level)} · {c.creditUnits} units</p>
                          )}
                          {c.assignments?.[0]?.lecturer && (
                            <p className="text-xs text-muted-foreground">Lecturer: {c.assignments[0].lecturer.name}</p>
                          )}
                        </div>
                        {(c.assessments?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Open Assignments</p>
                            <ul className="space-y-1">
                              {c.assessments!.map((a) => (
                                <li key={a.id}>
                                  <Link
                                    to={ROUTES.STUDENT_ASSIGNMENT.replace(':assessmentId', a.id)}
                                    className="flex items-center justify-between text-sm hover:text-primary transition-colors"
                                  >
                                    <span className="truncate">{a.title}</span>
                                    {a.dueDate && (
                                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                        {new Date(a.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <button
                          onClick={() => void handleDrop(c.id)}
                          disabled={dropping === c.id}
                          className="mt-auto text-xs text-muted-foreground hover:text-red-600 transition-colors self-end"
                        >
                          {dropping === c.id ? 'Dropping…' : 'Drop course'}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Standalone / joined courses */}
              {filteredJoined.length > 0 && (
                <div>
                  {filteredEnrolled.length > 0 && (
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Joined via Code</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {filteredJoined.map((c) => (
                      <article key={c.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-foreground">{c.title}</p>
                            {c.code && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{c.code}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {[c.department, levelLabel(c.level)].filter(Boolean).join(' · ')}
                          </p>
                          {c.user?.name && (
                            <p className="text-xs text-muted-foreground">Lecturer: {c.user.name}</p>
                          )}
                          {c.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(c.enrolledAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => navigate(buildRoute(ROUTES.STUDENT_LC_DETAIL, { id: c.id }))}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            View course <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          filteredAvailable.filter((c) => !c.enrolled).length === 0 ? (
            <EmptyState icon={<CheckCircle className="h-7 w-7" />} title="You're enrolled in all available courses!" size="lg" />
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredAvailable.filter((c) => !c.enrolled).map((c) => (
                <article key={c.id} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{c.title}</p>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{c.code}</span>
                    </div>
                    {c.department?.name && (
                      <p className="text-xs text-muted-foreground mt-1">{c.department.name} · {levelLabel(c.level)} · {c.creditUnits} units</p>
                    )}
                    {c.assignments?.[0]?.lecturer && (
                      <p className="text-xs text-muted-foreground">Lecturer: {c.assignments[0].lecturer.name}</p>
                    )}
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void handleEnroll(c.id)}
                    disabled={enrolling === c.id}
                    className="mt-auto flex items-center gap-1.5 text-sm text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors self-start disabled:opacity-50"
                  >
                    {enrolling === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Enroll
                  </button>
                </article>
              ))}
            </div>
          )
        )}
      </div>

      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={() => void load()} />
      )}
    </>
  )
}
