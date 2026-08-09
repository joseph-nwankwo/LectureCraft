import { apiClient } from './client'
import type { PaginationParams, PaginatedResponse } from '@/types/api.types'

export interface Course {
  id:           string
  createdBy:    string
  title:        string
  code:         string | null
  description:  string | null
  level:        string
  credits:      number | null
  semester:     string | null
  academicYear: string | null
  department:   string | null
  faculty:      string | null
  enrollCode:   string | null
  createdAt:    string
  updatedAt:    string
}

export interface CoursePreview {
  id:          string
  title:       string
  code:        string | null
  description: string | null
  level:       string
  department:  string | null
  faculty:     string | null
  enrollCode:  string
  user:        { name: string; avatarUrl: string | null }
  _count:      { enrollments: number }
}

export interface CourseDocument {
  id:          string
  title:       string
  type:        string
  status:      string
  fileUrl:     string | null
  fileType:    string | null
  sizeBytes:   number | null
  description: string | null
  createdAt:   string
}

export interface CourseAssessment {
  id:           string
  title:        string
  type:         string
  status:       string
  totalMarks:   number
  durationMins: number | null
  dueDate:      string | null
  openDate:     string | null
  instructions: string | null
  createdAt:    string
}

export interface CourseContent {
  documents:   CourseDocument[]
  assessments: CourseAssessment[]
}

export interface JoinedCourse {
  id:               string
  title:            string
  code:             string | null
  description:      string | null
  level:            string
  department:       string | null
  faculty:          string | null
  semester:         string | null
  academicYear:     string | null
  enrollCode:       string | null
  enrolledAt:       string
  enrollmentStatus: string
  isLecturerCourse: true
  user:             { name: string; avatarUrl: string | null }
}

export interface Announcement {
  id:        string
  courseId:  string
  authorId:  string
  title:     string
  content:   string
  isPinned:  boolean
  createdAt: string
  updatedAt: string
  author:    { id: string; name: string; avatarUrl: string | null }
}

export interface Material {
  id:        string
  title:     string
  type:      string
  status:    string
  fileUrl:   string | null
  fileType:  string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
  user:      { name: string }
}

export interface ClassSession {
  id:           string
  courseId:     string
  title:        string
  description:  string | null
  scheduledAt:  string
  durationMins: number
  location:     string | null
  isOnline:     boolean
  meetLink:     string | null
  createdAt:    string
}

export interface Poll {
  id:        string
  courseId:  string
  createdBy: string
  question:  string
  options:   string[]
  isActive:  boolean
  expiresAt: string | null
  createdAt: string
  responses: { selectedOption: number; studentId?: string }[]
  _count:    { responses: number }
}

export interface ClassAssignment {
  id:            string
  courseId:      string
  createdBy:     string
  title:         string
  description:   string | null
  dueDate:       string | null
  totalMarks:    number | null
  attachmentUrl: string | null
  createdAt:     string
  updatedAt:     string
  _count:        { submissions: number }
  submissions?:  { grade: number | null; feedback: string | null; submittedAt: string; submissionUrl: string | null; textContent: string | null }[]
}

export interface AssignmentSubmission {
  id:            string
  assignmentId:  string
  studentId:     string
  submissionUrl: string | null
  textContent:   string | null
  grade:         number | null
  feedback:      string | null
  submittedAt:   string
  gradedAt:      string | null
  student:       { id: string; name: string; avatarUrl: string | null }
}

export interface AttendanceRecord {
  id:        string
  courseId:  string
  date:      string
  createdAt: string
  entries:   AttendanceEntryItem[]
}

export interface AttendanceEntryItem {
  id:        string
  recordId:  string
  studentId: string
  status:    'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  student?:  { id: string; name: string; avatarUrl: string | null }
}

export interface StudentAttendanceEntry {
  id:       string
  status:   'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  record:   { date: string }
}

export interface DiscussionThread {
  id:         string
  courseId:   string
  authorId:   string
  title:      string
  body:       string
  isPinned:   boolean
  isResolved: boolean
  createdAt:  string
  updatedAt:  string
  author:     { id: string; name: string; avatarUrl: string | null }
  _count:     { replies: number }
}

export interface DiscussionReply {
  id:        string
  threadId:  string
  authorId:  string
  body:      string
  createdAt: string
  updatedAt: string
  author:    { id: string; name: string; avatarUrl: string | null }
}

export interface CreateCoursePayload {
  title: string
  code?: string
  description?: string
  level: string
  credits?: number
  semester?: string
  academicYear?: string
  department?: string
  faculty?: string
}

export const coursesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Course>>('/courses', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<{ course: Course }>(`/courses/${id}`).then((r) => r.data.course),

  create: (payload: CreateCoursePayload) =>
    apiClient.post<{ course: Course }>('/courses', payload).then((r) => r.data.course),

  update: (id: string, payload: Partial<CreateCoursePayload>) =>
    apiClient.put<{ course: Course }>(`/courses/${id}`, payload).then((r) => r.data.course),

  delete: (id: string) =>
    apiClient.delete(`/courses/${id}`),

  regenerateCode: (id: string) =>
    apiClient.post<{ course: Course }>(`/courses/${id}/regenerate-code`).then((r) => r.data.course),

  getStudents: (id: string) =>
    apiClient.get<{ data: { id: string; enrolledAt: string; student: { id: string; name: string; email: string; avatarUrl: string | null } }[] }>(`/courses/${id}/students`).then((r) => r.data.data),

  getByCode: (code: string) =>
    apiClient.get<{ course: CoursePreview }>(`/courses/join/${code}`).then((r) => r.data.course),

  joinByCode: (code: string) =>
    apiClient.post(`/courses/join/${code}`),

  getMyJoined: () =>
    apiClient.get<{ data: JoinedCourse[] }>('/courses/my-joined').then((r) => r.data.data),

  // Educator: content management
  getCourseContent: (id: string) =>
    apiClient.get<{ data: CourseContent }>(`/courses/${id}/content`).then((r) => r.data.data),

  publishDocument: (id: string, documentId: string) =>
    apiClient.post(`/courses/${id}/content/document`, { documentId }),

  publishAssessment: (id: string, assessmentId: string) =>
    apiClient.post(`/courses/${id}/content/assessment`, { assessmentId }),

  removeDocument: (id: string, docId: string) =>
    apiClient.delete(`/courses/${id}/content/document/${docId}`),

  removeAssessment: (id: string, assessmentId: string) =>
    apiClient.delete(`/courses/${id}/content/assessment/${assessmentId}`),

  // Student: view published content for a joined course
  getStudentContent: (id: string) =>
    apiClient.get<{ data: CourseContent & { course: JoinedCourse & { user: { name: string; avatarUrl: string | null } } } }>(`/courses/${id}/student-content`).then((r) => r.data.data),

  // ── Class Connect features ────────────────────────────────────────────────
  getAnnouncements: (id: string) =>
    apiClient.get<{ data: Announcement[] }>(`/courses/${id}/announcements`).then((r) => r.data.data),

  createAnnouncement: (id: string, payload: { title: string; content: string; isPinned?: boolean }) =>
    apiClient.post<{ data: Announcement }>(`/courses/${id}/announcements`, payload).then((r) => r.data.data),

  updateAnnouncement: (id: string, annoId: string, payload: Partial<{ title: string; content: string; isPinned: boolean }>) =>
    apiClient.patch<{ data: Announcement }>(`/courses/${id}/announcements/${annoId}`, payload).then((r) => r.data.data),

  deleteAnnouncement: (id: string, annoId: string) =>
    apiClient.delete(`/courses/${id}/announcements/${annoId}`),

  getMaterials: (id: string) =>
    apiClient.get<{ data: Material[] }>(`/courses/${id}/materials`).then((r) => r.data.data),

  getSessions: (id: string) =>
    apiClient.get<{ data: ClassSession[] }>(`/courses/${id}/sessions`).then((r) => r.data.data),

  createSession: (id: string, payload: { title: string; scheduledAt: string; durationMins?: number; location?: string; isOnline?: boolean; meetLink?: string; description?: string }) =>
    apiClient.post<{ data: ClassSession }>(`/courses/${id}/sessions`, payload).then((r) => r.data.data),

  deleteSession: (id: string, sessionId: string) =>
    apiClient.delete(`/courses/${id}/sessions/${sessionId}`),

  getPolls: (id: string) =>
    apiClient.get<{ data: Poll[] }>(`/courses/${id}/polls`).then((r) => r.data.data),

  createPoll: (id: string, payload: { question: string; options: string[]; expiresAt?: string }) =>
    apiClient.post<{ data: Poll }>(`/courses/${id}/polls`, payload).then((r) => r.data.data),

  respondToPoll: (id: string, pollId: string, selectedOption: number) =>
    apiClient.post(`/courses/${id}/polls/${pollId}/respond`, { selectedOption }),

  closePoll: (id: string, pollId: string) =>
    apiClient.patch(`/courses/${id}/polls/${pollId}/close`),

  deletePoll: (id: string, pollId: string) =>
    apiClient.delete(`/courses/${id}/polls/${pollId}`),

  // ── Assignments ───────────────────────────────────────────────────────────
  getAssignments: (id: string) =>
    apiClient.get<{ data: ClassAssignment[] }>(`/courses/${id}/assignments`).then((r) => r.data.data),

  createAssignment: (id: string, payload: { title: string; description?: string; dueDate?: string; totalMarks?: number; attachmentUrl?: string }) =>
    apiClient.post<{ data: ClassAssignment }>(`/courses/${id}/assignments`, payload).then((r) => r.data.data),

  updateAssignment: (id: string, assignmentId: string, payload: Partial<{ title: string; description: string; dueDate: string | null; totalMarks: number | null; attachmentUrl: string | null }>) =>
    apiClient.patch<{ data: ClassAssignment }>(`/courses/${id}/assignments/${assignmentId}`, payload).then((r) => r.data.data),

  deleteAssignment: (id: string, assignmentId: string) =>
    apiClient.delete(`/courses/${id}/assignments/${assignmentId}`),

  getAssignmentSubmissions: (id: string, assignmentId: string) =>
    apiClient.get<{ data: AssignmentSubmission[] }>(`/courses/${id}/assignments/${assignmentId}/submissions`).then((r) => r.data.data),

  gradeSubmission: (id: string, assignmentId: string, submissionId: string, payload: { grade: number; feedback?: string }) =>
    apiClient.patch<{ data: AssignmentSubmission }>(`/courses/${id}/assignments/${assignmentId}/submissions/${submissionId}/grade`, payload).then((r) => r.data.data),

  // ── Attendance ────────────────────────────────────────────────────────────
  getAttendance: (id: string) =>
    apiClient.get<{ data: AttendanceRecord[] | StudentAttendanceEntry[] }>(`/courses/${id}/attendance`).then((r) => r.data.data),

  saveAttendance: (id: string, payload: { date: string; entries: { studentId: string; status: string }[] }) =>
    apiClient.post<{ data: AttendanceRecord }>(`/courses/${id}/attendance`, payload).then((r) => r.data.data),

  // ── Discussions ───────────────────────────────────────────────────────────
  getDiscussions: (id: string) =>
    apiClient.get<{ data: DiscussionThread[] }>(`/courses/${id}/discussions`).then((r) => r.data.data),

  createDiscussion: (id: string, payload: { title: string; body: string }) =>
    apiClient.post<{ data: DiscussionThread }>(`/courses/${id}/discussions`, payload).then((r) => r.data.data),

  deleteDiscussion: (id: string, threadId: string) =>
    apiClient.delete(`/courses/${id}/discussions/${threadId}`),

  getThreadReplies: (id: string, threadId: string) =>
    apiClient.get<{ data: DiscussionReply[] }>(`/courses/${id}/discussions/${threadId}/replies`).then((r) => r.data.data),

  addReply: (id: string, threadId: string, body: string) =>
    apiClient.post<{ data: DiscussionReply }>(`/courses/${id}/discussions/${threadId}/replies`, { body }).then((r) => r.data.data),

  deleteReply: (id: string, threadId: string, replyId: string) =>
    apiClient.delete(`/courses/${id}/discussions/${threadId}/replies/${replyId}`),

  pinThread: (id: string, threadId: string) =>
    apiClient.patch<{ data: DiscussionThread }>(`/courses/${id}/discussions/${threadId}/pin`).then((r) => r.data.data),

  resolveThread: (id: string, threadId: string) =>
    apiClient.patch<{ data: DiscussionThread }>(`/courses/${id}/discussions/${threadId}/resolve`).then((r) => r.data.data),
}
