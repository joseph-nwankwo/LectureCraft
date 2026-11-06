import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, Search, X, MoreHorizontal,
  GraduationCap, Calendar, Hash, Pencil, Trash2,
  Copy, Check, RefreshCw, Users, FolderOpen,
} from 'lucide-react'
import { coursesApi, type Course, type CreateCoursePayload } from '@/lib/api/courses.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/feedback/EmptyState'
import { PageHeader } from '@/components/design-system/layout/PageHeader'
import { ROUTES, buildRoute } from '@/constants/routes'

const LEVELS = ['ND', 'HND', 'BSC', 'MSC', 'MBA', 'PHD', 'PROFESSIONAL']

const LEVEL_COLOR: Record<string, 'default' | 'success' | 'warning'> = {
  ND: 'default', HND: 'default', BSC: 'success',
  MSC: 'success', MBA: 'warning', PHD: 'warning', PROFESSIONAL: 'warning',
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
interface CourseFormProps {
  initial?: Partial<CreateCoursePayload>
  onSave: (data: CreateCoursePayload) => void
  onCancel: () => void
  isSaving: boolean
}

function CourseForm({ initial, onSave, onCancel, isSaving }: CourseFormProps) {
  const [form, setForm] = useState<CreateCoursePayload>({
    title:       initial?.title       ?? '',
    code:        initial?.code        ?? '',
    description: initial?.description ?? '',
    level:       initial?.level       ?? 'BSC',
    credits:     initial?.credits     ?? undefined,
    semester:    initial?.semester    ?? '',
    academicYear:initial?.academicYear?? '',
    department:  initial?.department  ?? '',
    faculty:     initial?.faculty     ?? '',
  })

  function set(field: keyof CreateCoursePayload, value: string | number) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.level) return
    onSave({ ...form, credits: form.credits ? Number(form.credits) : undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold">{initial ? 'Edit Course' : 'Create Course'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Course Title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Introduction to Algorithms" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Course Code" value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} placeholder="CS 301" />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Level <span className="text-error">*</span></label>
              <select
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Credits" type="number" value={form.credits?.toString() ?? ''} onChange={(e) => set('credits', e.target.value)} placeholder="3" />
            <TextField label="Semester" value={form.semester ?? ''} onChange={(e) => set('semester', e.target.value)} placeholder="First" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Department" value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} placeholder="Computer Science" />
            <TextField label="Faculty" value={form.faculty ?? ''} onChange={(e) => set('faculty', e.target.value)} placeholder="Engineering" />
          </div>
          <TextField label="Academic Year" value={form.academicYear ?? ''} onChange={(e) => set('academicYear', e.target.value)} placeholder="2024/2025" />
          <TextField label="Description (optional)" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="A brief course description…" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-none px-5">Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={isSaving} loadingText="Saving…">
              {initial ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Join Code Badge ───────────────────────────────────────────────────────────
function JoinCodeBadge({ course, onRegenerate }: { course: Course; onRegenerate: (id: string) => void }) {
  const [copied,      setCopied]      = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    if (!course.enrollCode) return
    await navigator.clipboard.writeText(course.enrollCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate(e: React.MouseEvent) {
    e.stopPropagation()
    setRegenerating(true)
    try { await onRegenerate(course.id) } finally { setRegenerating(false) }
  }

  if (!course.enrollCode) {
    return (
      <button type="button" onClick={handleRegenerate}
        className="text-xs text-primary hover:underline" disabled={regenerating}>
        {regenerating ? 'Generating…' : 'Generate join code'}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-primary/8 px-2 py-1" onClick={(e) => e.stopPropagation()}>
      <span className="font-mono text-xs font-bold tracking-widest text-primary">{course.enrollCode}</span>
      <button type="button" onClick={handleCopy} className="text-primary/60 hover:text-primary transition-colors" title="Copy code">
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <button type="button" onClick={handleRegenerate} disabled={regenerating}
        className="text-primary/60 hover:text-primary transition-colors" title="Regenerate code">
        <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onDelete, onRegenerate, onViewStudents }: {
  course: Course; onEdit: () => void; onDelete: () => void
  onRegenerate: (id: string) => void; onViewStudents: (course: Course) => void
}) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="group relative flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-hover cursor-pointer"
      onClick={() => navigate(buildRoute(ROUTES.LC_COURSE_DETAIL, { id: course.id }))}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          aria-label="Course actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-3 top-10 z-10 w-36 rounded-lg border border-border bg-card py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate(buildRoute(ROUTES.LC_COURSE_DETAIL, { id: course.id })) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Manage content
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onEdit() }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onViewStudents(course) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              <Users className="h-3.5 w-3.5" /> Students
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{course.title}</p>
        {course.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {course.code && (
          <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{course.code}</span>
        )}
        {course.department && (
          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{course.department}</span>
        )}
        {course.semester && (
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{course.semester}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={LEVEL_COLOR[course.level] ?? 'default'} size="sm">{course.level}</Badge>
        {course.credits && <span className="text-xs text-muted-foreground">{course.credits} credit{course.credits !== 1 ? 's' : ''}</span>}
      </div>

      <div className="border-t border-border pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Student join code</p>
        <JoinCodeBadge course={course} onRegenerate={onRegenerate} />
      </div>
    </div>
  )
}

// ── Students Modal ────────────────────────────────────────────────────────────
function StudentsModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['course-students', course.id],
    queryFn: () => coursesApi.getStudents(course.id),
    staleTime: 30_000,
  })
  const students = data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Enrolled Students</h2>
            <p className="text-sm text-muted-foreground">{course.title}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Skeleton className="h-6 w-32" /></div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">No students enrolled yet.</p>
            <p className="text-xs mt-1">Share your join code <span className="font-mono font-bold text-primary">{course.enrollCode ?? '—'}</span> to get started.</p>
          </div>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {students.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {e.student.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.student.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.student.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-4">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const qc       = useQueryClient()
  const [search, setSearch]     = useState('')
  const [page,   setPage]       = useState(1)
  const [showCreate, setCreate] = useState(false)
  const [editing,    setEditing] = useState<Course | null>(null)
  const [viewingStudents, setViewingStudents] = useState<Course | null>(null)
  const [error,      setError]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search],
    queryFn: () => coursesApi.list({ page, pageSize: 12, search } as never),
    staleTime: 30_000,
  })

  const courses    = (data as { data?: Course[] })?.data ?? []
  const total      = (data as { total?: number })?.total ?? 0
  const totalPages = Math.ceil(total / 12)

  const regenMut = useMutation({
    mutationFn: (id: string) => coursesApi.regenerateCode(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })

  const createMut = useMutation({
    mutationFn: (payload: CreateCoursePayload) => coursesApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setCreate(false); setError('') },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create course'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCoursePayload> }) => coursesApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditing(null); setError('') },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update course'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Courses"
        description="Manage your courses and teaching materials."
        actions={(
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setError(''); setCreate(true) }}>
            Create Course
          </Button>
        )}
      />

      {error && <Alert variant="error" description={error} />}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search courses…"
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={search ? 'No courses match your search' : 'No courses yet'}
          description={search ? 'Try a different search term' : 'Create your first course to get started'}
          action={!search && (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setError(''); setCreate(true) }}>
              Create Course
            </Button>
          )}
          size="lg"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={() => { setError(''); setEditing(c) }}
              onDelete={() => { if (window.confirm(`Delete "${c.title}"?`)) deleteMut.mutate(c.id) }}
              onRegenerate={(id) => regenMut.mutateAsync(id)}
              onViewStudents={(course) => setViewingStudents(course)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CourseForm
          onSave={(payload) => createMut.mutate(payload)}
          onCancel={() => { setCreate(false); setError('') }}
          isSaving={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <CourseForm
          initial={editing as Partial<CreateCoursePayload>}
          onSave={(payload) => updateMut.mutate({ id: editing.id, payload })}
          onCancel={() => { setEditing(null); setError('') }}
          isSaving={updateMut.isPending}
        />
      )}

      {/* Students Modal */}
      {viewingStudents && (
        <StudentsModal course={viewingStudents} onClose={() => setViewingStudents(null)} />
      )}
    </div>
  )
}
