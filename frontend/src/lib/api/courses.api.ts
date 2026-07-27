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
}
