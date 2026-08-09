import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, ClipboardList, Users, Plus, Trash2,
  Loader2, AlertCircle, FileText, Hash, X, Search,
  Megaphone, CalendarDays, BarChart2, Pin, CheckCircle2,
  MapPin, Video, Clock, ClipboardCheck, UserCheck, MessageSquare, CheckCheck,
} from 'lucide-react'
import { coursesApi, type Course, type CourseDocument, type CourseAssessment, type Announcement, type ClassSession, type Poll, type ClassAssignment, type AssignmentSubmission, type AttendanceRecord, type DiscussionThread, type DiscussionReply } from '@/lib/api/courses.api'
import { documentsApi, type Document } from '@/lib/api/documents.api'
import { assessmentApi, type Assessment } from '@/lib/api/assessment.api'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'

type Tab = 'documents' | 'assessments' | 'students' | 'announcements' | 'schedule' | 'polls' | 'assignments' | 'attendance' | 'discussions'

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
      .then((r) => setItems(r.data))
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [sessions, setSessions]     = useState<ClassSession[]>([])
  const [polls, setPolls]           = useState<Poll[]>([])
  const [assignments, setAssignments] = useState<ClassAssignment[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [tab, setTab]               = useState<Tab>('announcements')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [showPickDoc, setShowPickDoc]           = useState(false)
  const [showPickAssessment, setShowPickAssessment] = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)

  // Announcement form
  const [showAnnoForm, setShowAnnoForm] = useState(false)
  const [annoTitle, setAnnoTitle]       = useState('')
  const [annoContent, setAnnoContent]   = useState('')
  const [annoPin, setAnnoPin]           = useState(false)
  const [savingAnno, setSavingAnno]     = useState(false)

  // Session form
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionTitle, setSessionTitle]       = useState('')
  const [sessionDate, setSessionDate]         = useState('')
  const [sessionDuration, setSessionDuration] = useState(60)
  const [sessionLocation, setSessionLocation] = useState('')
  const [sessionOnline, setSessionOnline]     = useState(false)
  const [sessionMeetLink, setSessionMeetLink] = useState('')
  const [savingSession, setSavingSession]     = useState(false)
  const [embeddedSessionId, setEmbeddedSessionId] = useState<string | null>(null)

  // Poll form
  const [showPollForm, setShowPollForm] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions]   = useState(['', ''])
  const [savingPoll, setSavingPoll]     = useState(false)

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignTitle, setAssignTitle]           = useState('')
  const [assignDesc, setAssignDesc]             = useState('')
  const [assignDueDate, setAssignDueDate]       = useState('')
  const [assignMarks, setAssignMarks]           = useState<number | ''>('')
  const [assignAttachment, setAssignAttachment] = useState('')
  const [savingAssign, setSavingAssign]     = useState(false)
  const [expandedAssign, setExpandedAssign] = useState<string | null>(null)
  const [submissions, setSubmissions]       = useState<Record<string, AssignmentSubmission[]>>({})
  const [loadingSubmissions, setLoadingSubmissions] = useState<string | null>(null)
  const [gradingMap, setGradingMap]         = useState<Record<string, { grade: string; feedback: string }>>({})
  const [savingGrade, setSavingGrade]       = useState<string | null>(null)

  // Attendance form
  const [attendDate, setAttendDate]         = useState(() => new Date().toISOString().split('T')[0])
  const [attendStatuses, setAttendStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({})
  const [savingAttend, setSavingAttend]     = useState(false)

  // Discussion board
  const [discussions, setDiscussions]         = useState<DiscussionThread[]>([])
  const [expandedThread, setExpandedThread]   = useState<string | null>(null)
  const [threadReplies, setThreadReplies]     = useState<Record<string, DiscussionReply[]>>({})
  const [loadingReplies, setLoadingReplies]   = useState<string | null>(null)
  const [replyInputs, setReplyInputs]         = useState<Record<string, string>>({})
  const [savingReply, setSavingReply]         = useState<string | null>(null)
  const [showThreadForm, setShowThreadForm]   = useState(false)
  const [threadTitle, setThreadTitle]         = useState('')
  const [threadBody, setThreadBody]           = useState('')
  const [savingThread, setSavingThread]       = useState(false)

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [courseData, content, studs, annos, sess, pls, assigns, attend, disc] = await Promise.all([
        coursesApi.get(id),
        coursesApi.getCourseContent(id),
        coursesApi.getStudents(id),
        coursesApi.getAnnouncements(id),
        coursesApi.getSessions(id),
        coursesApi.getPolls(id),
        coursesApi.getAssignments(id),
        coursesApi.getAttendance(id),
        coursesApi.getDiscussions(id),
      ])
      setCourse(courseData)
      setDocs(content.documents)
      setAssessments(content.assessments)
      setStudents(studs)
      setAnnouncements(annos)
      setSessions(sess)
      setPolls(pls)
      setAssignments(assigns)
      setAttendanceRecords(attend as AttendanceRecord[])
      setDiscussions(disc)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateThread() {
    if (!id || !threadTitle.trim() || !threadBody.trim()) return
    setSavingThread(true)
    try {
      const item = await coursesApi.createDiscussion(id, { title: threadTitle.trim(), body: threadBody.trim() })
      setDiscussions((prev) => [item, ...prev])
      setThreadTitle(''); setThreadBody(''); setShowThreadForm(false)
    } catch (e) { setError((e as Error).message) }
    finally { setSavingThread(false) }
  }

  async function handleDeleteThread(threadId: string) {
    if (!id || !confirm('Delete this thread?')) return
    await coursesApi.deleteDiscussion(id, threadId)
    setDiscussions((prev) => prev.filter((t) => t.id !== threadId))
    if (expandedThread === threadId) setExpandedThread(null)
  }

  async function handleExpandThread(threadId: string) {
    if (expandedThread === threadId) { setExpandedThread(null); return }
    setExpandedThread(threadId)
    if (threadReplies[threadId]) return
    setLoadingReplies(threadId)
    try {
      const replies = await coursesApi.getThreadReplies(id!, threadId)
      setThreadReplies((prev) => ({ ...prev, [threadId]: replies }))
    } catch (e) { setError((e as Error).message) }
    finally { setLoadingReplies(null) }
  }

  async function handleReply(threadId: string) {
    if (!id) return
    const body = (replyInputs[threadId] ?? '').trim()
    if (!body) return
    setSavingReply(threadId)
    try {
      const reply = await coursesApi.addReply(id, threadId, body)
      setThreadReplies((prev) => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), reply] }))
      setDiscussions((prev) => prev.map((t) => t.id === threadId ? { ...t, _count: { replies: t._count.replies + 1 } } : t))
      setReplyInputs((prev) => ({ ...prev, [threadId]: '' }))
    } catch (e) { setError((e as Error).message) }
    finally { setSavingReply(null) }
  }

  async function handleDeleteReply(threadId: string, replyId: string) {
    if (!id || !confirm('Delete this reply?')) return
    await coursesApi.deleteReply(id, threadId, replyId)
    setThreadReplies((prev) => ({ ...prev, [threadId]: (prev[threadId] ?? []).filter((r) => r.id !== replyId) }))
    setDiscussions((prev) => prev.map((t) => t.id === threadId ? { ...t, _count: { replies: Math.max(0, t._count.replies - 1) } } : t))
  }

  async function handlePinThread(threadId: string) {
    if (!id) return
    const updated = await coursesApi.pinThread(id, threadId)
    setDiscussions((prev) => prev.map((t) => t.id === threadId ? updated : t).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)))
  }

  async function handleResolveThread(threadId: string) {
    if (!id) return
    const updated = await coursesApi.resolveThread(id, threadId)
    setDiscussions((prev) => prev.map((t) => t.id === threadId ? updated : t))
  }

  async function handleCreateAnnouncement() {
    if (!id || !annoTitle.trim() || !annoContent.trim()) return
    setSavingAnno(true)
    try {
      const item = await coursesApi.createAnnouncement(id, { title: annoTitle, content: annoContent, isPinned: annoPin })
      setAnnouncements((prev) => [item, ...prev])
      setAnnoTitle(''); setAnnoContent(''); setAnnoPin(false); setShowAnnoForm(false)
    } catch (e) { setError((e as Error).message) }
    finally { setSavingAnno(false) }
  }

  async function handleDeleteAnnouncement(annoId: string) {
    if (!id || !confirm('Delete this announcement?')) return
    await coursesApi.deleteAnnouncement(id, annoId)
    setAnnouncements((prev) => prev.filter((a) => a.id !== annoId))
  }

  async function handleCreateSession() {
    if (!id || !sessionTitle.trim() || !sessionDate) return
    setSavingSession(true)
    try {
      const item = await coursesApi.createSession(id, {
        title: sessionTitle, scheduledAt: sessionDate, durationMins: sessionDuration,
        location: sessionLocation || undefined, isOnline: sessionOnline,
        meetLink: sessionMeetLink || undefined,
      })
      setSessions((prev) => [...prev, item].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()))
      setSessionTitle(''); setSessionDate(''); setSessionLocation(''); setSessionMeetLink(''); setSessionOnline(false); setShowSessionForm(false)
    } catch (e) { setError((e as Error).message) }
    finally { setSavingSession(false) }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!id || !confirm('Delete this session?')) return
    await coursesApi.deleteSession(id, sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  async function handleCreatePoll() {
    if (!id || !pollQuestion.trim() || pollOptions.filter(Boolean).length < 2) return
    setSavingPoll(true)
    try {
      const item = await coursesApi.createPoll(id, { question: pollQuestion, options: pollOptions.filter(Boolean) })
      setPolls((prev) => [item, ...prev])
      setPollQuestion(''); setPollOptions(['', '']); setShowPollForm(false)
    } catch (e) { setError((e as Error).message) }
    finally { setSavingPoll(false) }
  }

  async function handleClosePoll(pollId: string) {
    if (!id) return
    await coursesApi.closePoll(id, pollId)
    setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, isActive: false } : p))
  }

  async function handleDeletePoll(pollId: string) {
    if (!id || !confirm('Delete this poll?')) return
    await coursesApi.deletePoll(id, pollId)
    setPolls((prev) => prev.filter((p) => p.id !== pollId))
  }

  async function handleCreateAssignment() {
    if (!id || !assignTitle.trim()) return
    setSavingAssign(true)
    try {
      const item = await coursesApi.createAssignment(id, {
        title: assignTitle, description: assignDesc || undefined,
        dueDate: assignDueDate || undefined, totalMarks: assignMarks !== '' ? Number(assignMarks) : undefined,
        attachmentUrl: assignAttachment.trim() || undefined,
      })
      setAssignments((prev) => [item, ...prev])
      setAssignTitle(''); setAssignDesc(''); setAssignDueDate(''); setAssignMarks(''); setAssignAttachment(''); setShowAssignForm(false)
    } catch (e) { setError((e as Error).message) }
    finally { setSavingAssign(false) }
  }

  async function handleDeleteAssignment(assignmentId: string) {
    if (!id || !confirm('Delete this assignment?')) return
    await coursesApi.deleteAssignment(id, assignmentId)
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
    if (expandedAssign === assignmentId) setExpandedAssign(null)
  }

  async function handleExpandAssignment(assignmentId: string) {
    if (expandedAssign === assignmentId) { setExpandedAssign(null); return }
    setExpandedAssign(assignmentId)
    if (submissions[assignmentId]) return
    setLoadingSubmissions(assignmentId)
    try {
      const subs = await coursesApi.getAssignmentSubmissions(id!, assignmentId)
      setSubmissions((prev) => ({ ...prev, [assignmentId]: subs }))
      const map: Record<string, { grade: string; feedback: string }> = {}
      subs.forEach((s) => { map[s.id] = { grade: s.grade !== null ? String(s.grade) : '', feedback: s.feedback ?? '' } })
      setGradingMap((prev) => ({ ...prev, ...map }))
    } catch (e) { setError((e as Error).message) }
    finally { setLoadingSubmissions(null) }
  }

  async function handleGrade(assignmentId: string, submissionId: string) {
    if (!id) return
    const g = gradingMap[submissionId]
    if (!g || g.grade === '') return
    setSavingGrade(submissionId)
    try {
      const updated = await coursesApi.gradeSubmission(id, assignmentId, submissionId, { grade: Number(g.grade), feedback: g.feedback || undefined })
      setSubmissions((prev) => ({
        ...prev,
        [assignmentId]: (prev[assignmentId] ?? []).map((s) => s.id === submissionId ? updated : s),
      }))
    } catch (e) { setError((e as Error).message) }
    finally { setSavingGrade(null) }
  }

  async function handleSaveAttendance() {
    if (!id || students.length === 0) return
    setSavingAttend(true)
    try {
      const entries = students.map((e) => ({
        studentId: e.student.id,
        status: attendStatuses[e.student.id] ?? 'ABSENT',
      }))
      const record = await coursesApi.saveAttendance(id, { date: attendDate, entries })
      setAttendanceRecords((prev) => {
        const idx = prev.findIndex((r) => r.date.startsWith(attendDate))
        if (idx >= 0) { const next = [...prev]; next[idx] = record; return next }
        return [record, ...prev]
      })
    } catch (e) { setError((e as Error).message) }
    finally { setSavingAttend(false) }
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
    { key: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" />,        count: announcements.length },
    { key: 'assignments',   label: 'Assignments',   icon: <ClipboardCheck className="h-4 w-4" />,   count: assignments.length },
    { key: 'discussions',   label: 'Discussion',    icon: <MessageSquare className="h-4 w-4" />,    count: discussions.length },
    { key: 'schedule',      label: 'Schedule',      icon: <CalendarDays className="h-4 w-4" />,      count: sessions.length },
    { key: 'polls',         label: 'Polls',         icon: <BarChart2 className="h-4 w-4" />,         count: polls.length },
    { key: 'attendance',    label: 'Attendance',    icon: <UserCheck className="h-4 w-4" />,          count: attendanceRecords.length },
    { key: 'documents',     label: 'Lecture Notes', icon: <BookOpen className="h-4 w-4" />,          count: docs.length },
    { key: 'assessments',   label: 'Assessments',   icon: <ClipboardList className="h-4 w-4" />,     count: assessments.length },
    { key: 'students',      label: 'Students',      icon: <Users className="h-4 w-4" />,             count: students.length },
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


        {/* Announcements tab */}
        {tab === 'announcements' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Post notices to all enrolled students instantly.</p>
              <button onClick={() => setShowAnnoForm(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New announcement
              </button>
            </div>

            {showAnnoForm && (
              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <input value={annoTitle} onChange={(e) => setAnnoTitle(e.target.value)}
                  placeholder="Title" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea value={annoContent} onChange={(e) => setAnnoContent(e.target.value)}
                  placeholder="Write your announcement…" rows={4}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={annoPin} onChange={(e) => setAnnoPin(e.target.checked)} className="rounded" />
                    Pin to top
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAnnoForm(false)} className="text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={() => void handleCreateAnnouncement()} disabled={savingAnno || !annoTitle.trim() || !annoContent.trim()}
                      className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {savingAnno ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {announcements.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Megaphone className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No announcements yet</p>
                <p className="text-xs mt-1">Post your first announcement to notify all students</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className={cn('rounded-xl border bg-card p-4', a.isPinned ? 'border-primary/40' : 'border-border')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {a.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                          <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                      <button onClick={() => void handleDeleteAnnouncement(a.id)}
                        className="shrink-0 p-1.5 text-muted-foreground hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule tab */}
        {tab === 'schedule' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Schedule class sessions — students will be notified.</p>
              <button onClick={() => setShowSessionForm(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add session
              </button>
            </div>

            {showSessionForm && (
              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Session title (e.g. Week 3 — Integration)" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date & Time</label>
                    <input type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Duration (mins)</label>
                    <input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(Number(e.target.value))} min={15} max={300}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={sessionOnline} onChange={(e) => setSessionOnline(e.target.checked)} className="rounded" />
                  Online session
                </label>
                {sessionOnline ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input value={sessionMeetLink} onChange={(e) => setSessionMeetLink(e.target.value)}
                        placeholder="Paste Google Meet / Zoom link — or generate below"
                        className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      <button
                        type="button"
                        onClick={() => setSessionMeetLink(`https://meet.jit.si/LectureCraft-${Math.random().toString(36).slice(2, 10)}`)}
                        className="shrink-0 flex items-center gap-1.5 text-xs border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors whitespace-nowrap">
                        <Video className="h-3.5 w-3.5" /> Generate Jitsi room
                      </button>
                    </div>
                    {sessionMeetLink.includes('meet.jit.si') && (
                      <p className="text-xs text-green-600 dark:text-green-400">Jitsi room — students can join directly inside the app</p>
                    )}
                  </div>
                ) : (
                  <input value={sessionLocation} onChange={(e) => setSessionLocation(e.target.value)}
                    placeholder="Location (e.g. LT2, Block C)" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowSessionForm(false)} className="text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={() => void handleCreateSession()} disabled={savingSession || !sessionTitle.trim() || !sessionDate}
                    className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Schedule'}
                  </button>
                </div>
              </div>
            )}

            {sessions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No sessions scheduled yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const isPast    = new Date(s.scheduledAt) < new Date()
                  const isJitsi   = !!s.meetLink?.includes('meet.jit.si')
                  const isOpen    = embeddedSessionId === s.id
                  return (
                    <div key={s.id} className={cn('bg-card border rounded-xl overflow-hidden', isPast ? 'border-border opacity-60' : 'border-border')}>
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          {s.isOnline ? <Video className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.title}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(s.scheduledAt).toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.durationMins} min</span>
                            {s.isOnline && s.meetLink && !isJitsi && (
                              <a href={s.meetLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">Join link ↗</a>
                            )}
                            {s.isOnline && isJitsi && (
                              <button onClick={() => setEmbeddedSessionId(isOpen ? null : s.id)}
                                className="text-primary hover:underline">
                                {isOpen ? 'Close room' : 'Open room in-app'}
                              </button>
                            )}
                            {!s.isOnline && s.location && <span>{s.location}</span>}
                          </div>
                        </div>
                        <button onClick={() => void handleDeleteSession(s.id)}
                          className="shrink-0 p-1.5 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {isOpen && s.meetLink && (
                        <div className="border-t border-border">
                          <iframe
                            src={s.meetLink}
                            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
                            className="w-full"
                            style={{ height: '520px', border: 'none' }}
                            title={s.title}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Polls tab */}
        {tab === 'polls' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Launch quick polls — students respond in real time.</p>
              <button onClick={() => setShowPollForm(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New poll
              </button>
            </div>

            {showPollForm && (
              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question…" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={opt} onChange={(e) => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o) }}
                        placeholder={`Option ${i + 1}`} className="flex-1 border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-600"><X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-primary hover:underline">+ Add option</button>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowPollForm(false)} className="text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={() => void handleCreatePoll()} disabled={savingPoll || !pollQuestion.trim() || pollOptions.filter(Boolean).length < 2}
                    className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingPoll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Launch poll'}
                  </button>
                </div>
              </div>
            )}

            {polls.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <BarChart2 className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No polls yet</p>
                <p className="text-xs mt-1">Launch a poll to get instant responses from your students</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((p) => {
                  const opts = p.options as string[]
                  const total = p._count.responses
                  const counts = opts.map((_, i) => p.responses.filter((r) => r.selectedOption === i).length)
                  return (
                    <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{p.question}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{total} response{total !== 1 ? 's' : ''} · {p.isActive ? <span className="text-green-600 dark:text-green-400">Live</span> : <span>Closed</span>}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {p.isActive && (
                            <button onClick={() => void handleClosePoll(p.id)} className="text-xs text-muted-foreground border border-border rounded-lg px-2 py-1 hover:bg-muted transition-colors">Close</button>
                          )}
                          <button onClick={() => void handleDeletePoll(p.id)} className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {opts.map((opt, i) => {
                          const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0
                          return (
                            <div key={i}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-foreground">{opt}</span>
                                <span className="text-muted-foreground">{counts[i]} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Assignments tab */}
        {tab === 'assignments' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Post assignments — students submit a URL or text. Grade inline.</p>
              <button onClick={() => setShowAssignForm(true)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                <Plus className="h-3.5 w-3.5" /> New assignment
              </button>
            </div>

            {showAssignForm && (
              <div className="mb-4 rounded-xl border border-border bg-card p-4 space-y-3">
                <input value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="Assignment title" className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea value={assignDesc} onChange={(e) => setAssignDesc(e.target.value)}
                  placeholder="Instructions (optional)" rows={3}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Due date (optional)</label>
                    <input type="datetime-local" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Total marks (optional)</label>
                    <input type="number" value={assignMarks} onChange={(e) => setAssignMarks(e.target.value === '' ? '' : Number(e.target.value))} min={1}
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Attachment URL (optional)</label>
                  <input value={assignAttachment} onChange={(e) => setAssignAttachment(e.target.value)}
                    placeholder="https://drive.google.com/… or any public link"
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAssignForm(false)} className="text-sm text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={() => void handleCreateAssignment()} disabled={savingAssign || !assignTitle.trim()}
                    className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingAssign ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
                  </button>
                </div>
              </div>
            )}

            {assignments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <ClipboardCheck className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No assignments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border bg-card">
                    <div className="flex items-start gap-3 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          {a.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Due {new Date(a.dueDate).toLocaleString()}</span>}
                          {a.totalMarks && <span>{a.totalMarks} marks</span>}
                          <span>{a._count.submissions} submission{a._count.submissions !== 1 ? 's' : ''}</span>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
                        {a.attachmentUrl && (
                          <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <FileText className="h-3 w-3" /> Attachment
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => void handleExpandAssignment(a.id)}
                          className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors">
                          {expandedAssign === a.id ? 'Hide' : 'View submissions'}
                        </button>
                        <button onClick={() => void handleDeleteAssignment(a.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {expandedAssign === a.id && (
                      <div className="border-t border-border px-4 py-3">
                        {loadingSubmissions === a.id ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                        ) : (submissions[a.id] ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No submissions yet</p>
                        ) : (
                          <div className="space-y-3">
                            {(submissions[a.id] ?? []).map((sub) => {
                              const g = gradingMap[sub.id] ?? { grade: '', feedback: '' }
                              return (
                                <div key={sub.id} className="rounded-lg border border-border p-3 space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                                        {sub.student.name.charAt(0)}
                                      </div>
                                      <p className="text-sm font-medium text-foreground">{sub.student.name}</p>
                                    </div>
                                    {sub.grade !== null && (
                                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                        {sub.grade}{a.totalMarks ? `/${a.totalMarks}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  {sub.submissionUrl && (
                                    <a href={sub.submissionUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline block truncate">{sub.submissionUrl}</a>
                                  )}
                                  {sub.textContent && <p className="text-xs text-muted-foreground line-clamp-3">{sub.textContent}</p>}
                                  <p className="text-xs text-muted-foreground">Submitted {new Date(sub.submittedAt).toLocaleString()}</p>
                                  <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                      <input
                                        type="number" value={g.grade} min={0} max={a.totalMarks ?? undefined}
                                        onChange={(e) => setGradingMap((prev) => ({ ...prev, [sub.id]: { ...g, grade: e.target.value } }))}
                                        placeholder={`Grade${a.totalMarks ? ` / ${a.totalMarks}` : ''}`}
                                        className="w-full border border-input rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                      />
                                    </div>
                                    <div className="flex-[2]">
                                      <input value={g.feedback}
                                        onChange={(e) => setGradingMap((prev) => ({ ...prev, [sub.id]: { ...g, feedback: e.target.value } }))}
                                        placeholder="Feedback (optional)"
                                        className="w-full border border-input rounded-lg px-2 py-1.5 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                      />
                                    </div>
                                    <button onClick={() => void handleGrade(a.id, sub.id)} disabled={savingGrade === sub.id || g.grade === ''}
                                      className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0">
                                      {savingGrade === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                      Grade
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Discussion Board tab */}
        {tab === 'discussions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Students and lecturers can post threads and reply. Pin or resolve threads to moderate the board.</p>
              <button onClick={() => setShowThreadForm((v) => !v)}
                className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors shrink-0 ml-4">
                <Plus className="h-3.5 w-3.5" /> New thread
              </button>
            </div>

            {showThreadForm && (
              <div className="mb-5 p-4 bg-card border border-border rounded-xl space-y-3">
                <input
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  placeholder="Thread title…"
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <textarea
                  value={threadBody}
                  onChange={(e) => setThreadBody(e.target.value)}
                  placeholder="Describe your question or topic…"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowThreadForm(false); setThreadTitle(''); setThreadBody('') }}
                    className="text-sm px-3 py-1.5 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => void handleCreateThread()} disabled={savingThread || !threadTitle.trim() || !threadBody.trim()}
                    className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {savingThread ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Post
                  </button>
                </div>
              </div>
            )}

            {discussions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No discussion threads yet</p>
                <button onClick={() => setShowThreadForm(true)} className="mt-2 text-sm text-primary hover:underline">
                  Start the first thread
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...discussions].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((t) => (
                  <div key={t.id} className={cn('bg-card border rounded-xl overflow-hidden', t.isPinned ? 'border-primary/40' : 'border-border')}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {t.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                            {t.isResolved && <CheckCheck className="h-3 w-3 text-green-500 shrink-0" />}
                            <span className="text-sm font-semibold text-foreground">{t.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t.author.name} · {new Date(t.createdAt).toLocaleDateString()} · {t._count.replies} {t._count.replies === 1 ? 'reply' : 'replies'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => void handlePinThread(t.id)} title={t.isPinned ? 'Unpin' : 'Pin'}
                            className={cn('p-1.5 rounded-md transition-colors', t.isPinned ? 'text-primary hover:text-muted-foreground' : 'text-muted-foreground hover:text-primary')}>
                            <Pin className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => void handleResolveThread(t.id)} title={t.isResolved ? 'Mark unresolved' : 'Mark resolved'}
                            className={cn('p-1.5 rounded-md transition-colors', t.isResolved ? 'text-green-500 hover:text-muted-foreground' : 'text-muted-foreground hover:text-green-500')}>
                            <CheckCheck className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => void handleDeleteThread(t.id)} title="Delete thread"
                            className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-foreground/80 line-clamp-2">{t.body}</p>
                      <button onClick={() => void handleExpandThread(t.id)}
                        className="mt-2 text-xs text-primary hover:underline">
                        {expandedThread === t.id ? 'Hide replies' : `View replies (${t._count.replies})`}
                      </button>
                    </div>

                    {expandedThread === t.id && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                        {loadingReplies === t.id ? (
                          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                        ) : (threadReplies[t.id] ?? []).length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">No replies yet — be the first!</p>
                        ) : (
                          (threadReplies[t.id] ?? []).map((r) => (
                            <div key={r.id} className="flex items-start gap-2">
                              <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-foreground">{r.author.name}</span>
                                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-foreground/80 mt-1">{r.body}</p>
                              </div>
                              <button onClick={() => void handleDeleteReply(t.id, r.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 shrink-0 transition-colors mt-1">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))
                        )}

                        <div className="flex gap-2">
                          <input
                            value={replyInputs[t.id] ?? ''}
                            onChange={(e) => setReplyInputs((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleReply(t.id) } }}
                            placeholder="Write a reply…"
                            className="flex-1 px-3 py-1.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <button onClick={() => void handleReply(t.id)} disabled={savingReply === t.id || !(replyInputs[t.id] ?? '').trim()}
                            className="flex items-center gap-1 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0">
                            {savingReply === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance tab */}
        {tab === 'attendance' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Mark attendance for any date. Updates replace the previous record for that day.</p>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <UserCheck className="mx-auto mb-3 h-8 w-8 opacity-30" />
                <p className="font-medium text-sm">No students enrolled yet</p>
                <p className="text-xs mt-1">Enroll students first before taking attendance</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                      <input type="date" value={attendDate} onChange={(e) => setAttendDate(e.target.value)}
                        className="border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="flex gap-2 ml-auto items-end">
                      <button onClick={() => { const m: Record<string, 'PRESENT'> = {}; students.forEach((e) => { m[e.student.id] = 'PRESENT' }); setAttendStatuses(m) }}
                        className="text-xs text-green-600 border border-green-200 dark:border-green-800 rounded-lg px-2 py-1.5 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors">
                        All Present
                      </button>
                      <button onClick={() => { const m: Record<string, 'ABSENT'> = {}; students.forEach((e) => { m[e.student.id] = 'ABSENT' }); setAttendStatuses(m) }}
                        className="text-xs text-red-600 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        All Absent
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {students.map((e) => {
                      const status = attendStatuses[e.student.id] ?? 'ABSENT'
                      return (
                        <div key={e.student.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
                            {e.student.name.charAt(0)}
                          </div>
                          <p className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{e.student.name}</p>
                          <div className="flex gap-1 shrink-0">
                            {(['PRESENT', 'LATE', 'EXCUSED', 'ABSENT'] as const).map((s) => (
                              <button key={s} onClick={() => setAttendStatuses((prev) => ({ ...prev, [e.student.id]: s }))}
                                className={cn(
                                  'text-xs px-2 py-1 rounded-lg border transition-colors',
                                  status === s
                                    ? s === 'PRESENT' ? 'bg-green-600 text-white border-green-600'
                                    : s === 'LATE'    ? 'bg-amber-500 text-white border-amber-500'
                                    : s === 'EXCUSED' ? 'bg-blue-500 text-white border-blue-500'
                                    : 'bg-red-600 text-white border-red-600'
                                    : 'border-border text-muted-foreground hover:border-primary/40',
                                )}>
                                {s === 'PRESENT' ? 'P' : s === 'LATE' ? 'L' : s === 'EXCUSED' ? 'E' : 'A'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button onClick={() => void handleSaveAttendance()} disabled={savingAttend}
                      className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {savingAttend ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Save attendance
                    </button>
                  </div>
                </div>

                {attendanceRecords.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Past records</h3>
                    <div className="space-y-2">
                      {attendanceRecords.map((rec) => {
                        const present = rec.entries.filter((e) => e.status === 'PRESENT').length
                        const total   = rec.entries.length
                        return (
                          <div key={rec.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground">{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{present}/{total} present</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
