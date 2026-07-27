import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, ClipboardList, Users, Plus, Trash2,
  Loader2, AlertCircle, FileText, Hash, X, Search,
} from 'lucide-react'
import { coursesApi, type Course, type CourseDocument, type CourseAssessment } from '@/lib/api/courses.api'
import { documentsApi, type Document } from '@/lib/api/documents.api'
import { assessmentApi, type Assessment } from '@/lib/api/assessment.api'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'

type Tab = 'documents' | 'assessments' | 'students'

// ── Pick-document modal ────────────────────────────────────────────────────────

interface PickDocModalProps {
  courseId: string
  onClose: () => void
  onPublished: () => void
}

function PickDocModal({ courseId, onClose, onPublished }: PickDocModalProps) {
  const [docs, setDocs]         = useState<Document[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    documentsApi.list({ pageSize: 100 } as Parameters<typeof documentsApi.list>[0])
      .then((r) => setDocs(r.data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  async function pick(doc: Document) {
    setSaving(doc.id)
    try {
      await coursesApi.publishDocument(courseId, doc.id)
      onPublished()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(null)
    }
  }

  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Attach a lecture note / document</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your documents…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No documents found</p>
          ) : (
            filtered.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.type?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => void pick(d)}
                  disabled={saving === d.id}
                  className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Attach
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Pick-assessment modal ──────────────────────────────────────────────────────

interface PickAssessmentModalProps {
  courseId: string
  onClose: () => void
  onPublished: () => void
}

function PickAssessmentModal({ courseId, onClose, onPublished }: PickAssessmentModalProps) {
  const [items, setItems]       = useState<Assessment[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    assessmentApi.listAssessments({ limit: 100 })
      .then((r) => setItems(r.data.data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  async function pick(a: Assessment) {
    setSaving(a.id)
    try {
      await coursesApi.publishAssessment(courseId, a.id)
      onPublished()
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(null)
    }
  }

  const filtered = items.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Attach an assignment / quiz / test</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-5 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your assessments…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No assessments found</p>
          ) : (
            filtered.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.type} · {a.totalMarks} marks
                    {a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ''}
                    <span className={cn('ml-2 font-medium', a.status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600')}>
                      {a.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => void pick(a)}
                  disabled={saving === a.id}
                  className="shrink-0 flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Attach
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function LecturerCourseDetailPage() {
  const { id }       = useParams<{ id: string }>()
  const navigate     = useNavigate()

  const [course, setCourse]         = useState<Course | null>(null)
  const [docs, setDocs]             = useState<CourseDocument[]>([])
  const [assessments, setAssessments] = useState<CourseAssessment[]>([])
  const [students, setStudents]     = useState<{ id: string; enrolledAt: string; student: { id: string; name: string; email: string; avatarUrl: string | null } }[]>([])
  const [tab, setTab]               = useState<Tab>('documents')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showPickDoc, setShowPickDoc]           = useState(false)
  const [showPickAssessment, setShowPickAssessment] = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [courseData, content, studs] = await Promise.all([
        coursesApi.get(id),
        coursesApi.getCourseContent(id),
        coursesApi.getStudents(id),
      ])
      setCourse(courseData)
      setDocs(content.documents)
      setAssessments(content.assessments)
      setStudents(studs)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [id])

  async function handleRemoveDoc(docId: string) {
    if (!id || !confirm('Remove this document from the course?')) return
    setRemoving(docId)
    try {
      await coursesApi.removeDocument(id, docId)
      setDocs((prev) => prev.filter((d) => d.id !== docId))
    } catch (e) { setError((e as Error).message) }
    finally { setRemoving(null) }
  }

  async function handleRemoveAssessment(assessmentId: string) {
    if (!id || !confirm('Remove this assessment from the course?')) return
    setRemoving(assessmentId)
    try {
      await coursesApi.removeAssessment(id, assessmentId)
      setAssessments((prev) => prev.filter((a) => a.id !== assessmentId))
    } catch (e) { setError((e as Error).message) }
    finally { setRemoving(null) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (!course) return (
    <div className="px-6 py-10 text-center text-muted-foreground">Course not found.</div>
  )

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'documents',   label: 'Lecture Notes',  icon: <BookOpen className="h-4 w-4" />,    count: docs.length },
    { key: 'assessments', label: 'Assessments',    icon: <ClipboardList className="h-4 w-4" />, count: assessments.length },
    { key: 'students',    label: 'Students',       icon: <Users className="h-4 w-4" />,        count: students.length },
  ]

  return (
    <>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-background">
        <button onClick={() => navigate(ROUTES.COURSES)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to courses
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {course.code && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{course.code}</span>}
              <span className="text-xs text-muted-foreground">{course.level}</span>
              {course.department && <span className="text-xs text-muted-foreground">{course.department}</span>}
              {course.enrollCode && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                  <Hash className="h-3 w-3" />{course.enrollCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-6">
          {tabs.map((t) => (
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

        {/* Documents tab */}
        {tab === 'documents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Attached documents are visible to enrolled students immediately.
              </p>
              <button onClick={() => setShowPickDoc(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Attach document
              </button>
            </div>

            {docs.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <BookOpen className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No lecture notes attached yet</p>
                <button onClick={() => setShowPickDoc(true)} className="mt-2 text-sm text-primary hover:underline">
                  Attach your first document
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.type?.toLowerCase().replace('_', ' ')} ·{' '}
                          {new Date(d.createdAt).toLocaleDateString()}
                          <span className={cn('ml-2 font-medium', d.status === 'PUBLISHED' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                            {d.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleRemoveDoc(d.id)}
                      disabled={removing === d.id}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Remove from course"
                    >
                      {removing === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assessments tab */}
        {tab === 'assessments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                Only <strong>Published</strong> assessments are visible to students. Students receive a notification when you attach one.
              </p>
              <button onClick={() => setShowPickAssessment(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shrink-0 ml-4">
                <Plus className="h-3.5 w-3.5" /> Attach assessment
              </button>
            </div>

            {assessments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <ClipboardList className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No assessments attached yet</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-2">
                  <button onClick={() => setShowPickAssessment(true)} className="text-sm text-primary hover:underline">
                    Attach an existing assessment
                  </button>
                  <span className="text-muted-foreground hidden sm:block">·</span>
                  <Link to={ROUTES.ASSESSMENT_LIST} className="text-sm text-primary hover:underline">
                    Create a new one
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {assessments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                        <span className={cn('text-xs font-medium shrink-0', a.status === 'PUBLISHED' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.type} · {a.totalMarks} marks
                        {a.durationMins ? ` · ${a.durationMins} min` : ''}
                        {a.dueDate ? ` · due ${new Date(a.dueDate).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleRemoveAssessment(a.id)}
                      disabled={removing === a.id}
                      className="shrink-0 p-1.5 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Remove from course"
                    >
                      {removing === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students tab */}
        {tab === 'students' && (
          <div>
            {students.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Users className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No students enrolled yet</p>
                <p className="text-xs mt-1">Share the join code <span className="font-mono font-semibold">{course.enrollCode}</span> with your students</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">
                      {e.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{e.student.name}</p>
                      <p className="text-xs text-muted-foreground">{e.student.email} · Joined {new Date(e.enrolledAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showPickDoc && (
        <PickDocModal courseId={id!} onClose={() => setShowPickDoc(false)} onPublished={() => void load()} />
      )}
      {showPickAssessment && (
        <PickAssessmentModal courseId={id!} onClose={() => setShowPickAssessment(false)} onPublished={() => void load()} />
      )}
    </>
  )
}
