-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateTable
CREATE TABLE "class_announcements" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_polls" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_poll_responses" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "selectedOption" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_poll_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "totalMarks" DOUBLE PRECISION,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assignment_submissions" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gradedBy" TEXT,
    "submissionUrl" TEXT,
    "textContent" TEXT,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "class_assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_attendance_records" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_entries" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',

    CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_discussion_threads" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_discussion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_discussion_replies" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_discussion_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_announcements_courseId_createdAt_idx" ON "class_announcements"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "class_sessions_courseId_scheduledAt_idx" ON "class_sessions"("courseId", "scheduledAt");

-- CreateIndex
CREATE INDEX "class_polls_courseId_isActive_idx" ON "class_polls"("courseId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "class_poll_responses_pollId_studentId_key" ON "class_poll_responses"("pollId", "studentId");

-- CreateIndex
CREATE INDEX "class_assignments_courseId_dueDate_idx" ON "class_assignments"("courseId", "dueDate");

-- CreateIndex
CREATE INDEX "class_assignment_submissions_studentId_idx" ON "class_assignment_submissions"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "class_assignment_submissions_assignmentId_studentId_key" ON "class_assignment_submissions"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "class_attendance_records_courseId_date_idx" ON "class_attendance_records"("courseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "class_attendance_records_courseId_date_key" ON "class_attendance_records"("courseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_entries_recordId_studentId_key" ON "attendance_entries"("recordId", "studentId");

-- CreateIndex
CREATE INDEX "class_discussion_threads_courseId_createdAt_idx" ON "class_discussion_threads"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "class_discussion_replies_threadId_createdAt_idx" ON "class_discussion_replies"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "class_announcements" ADD CONSTRAINT "class_announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_announcements" ADD CONSTRAINT "class_announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_polls" ADD CONSTRAINT "class_polls_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_polls" ADD CONSTRAINT "class_polls_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_poll_responses" ADD CONSTRAINT "class_poll_responses_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "class_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_poll_responses" ADD CONSTRAINT "class_poll_responses_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignment_submissions" ADD CONSTRAINT "class_assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "class_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignment_submissions" ADD CONSTRAINT "class_assignment_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assignment_submissions" ADD CONSTRAINT "class_assignment_submissions_gradedBy_fkey" FOREIGN KEY ("gradedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendance_records" ADD CONSTRAINT "class_attendance_records_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_attendance_records" ADD CONSTRAINT "class_attendance_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "class_attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_entries" ADD CONSTRAINT "attendance_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_threads" ADD CONSTRAINT "class_discussion_threads_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "lecturer_courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_threads" ADD CONSTRAINT "class_discussion_threads_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_replies" ADD CONSTRAINT "class_discussion_replies_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "class_discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_discussion_replies" ADD CONSTRAINT "class_discussion_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

