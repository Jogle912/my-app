-- CreateEnum
CREATE TYPE "AvailabilityKind" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('MANUAL', 'CANVAS', 'SYLLABUS');

-- CreateEnum
CREATE TYPE "AssignmentKind" AS ENUM ('HOMEWORK', 'PROJECT', 'READING', 'QUIZ', 'EXAM', 'DISCUSSION', 'OTHER');

-- CreateEnum
CREATE TYPE "SubmissionState" AS ENUM ('NONE', 'SUBMITTED', 'GRADED', 'EXCUSED', 'MISSING');

-- CreateEnum
CREATE TYPE "MilestoneOrigin" AS ENUM ('STUDENT', 'RULE', 'AI');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_preferences" (
    "userId" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "sleepStart" TEXT NOT NULL DEFAULT '23:30',
    "sleepEnd" TEXT NOT NULL DEFAULT '07:30',
    "maxStudyMinutesPerDay" INTEGER NOT NULL DEFAULT 240,
    "preferredSessionMinutes" INTEGER NOT NULL DEFAULT 50,
    "minSessionMinutes" INTEGER NOT NULL DEFAULT 25,
    "breakMinutes" INTEGER NOT NULL DEFAULT 10,
    "deadlineBufferHours" INTEGER NOT NULL DEFAULT 24,
    "energyMorning" INTEGER NOT NULL DEFAULT 2,
    "energyAfternoon" INTEGER NOT NULL DEFAULT 2,
    "energyEvening" INTEGER NOT NULL DEFAULT 2,
    "maxSameCourseSessionsPerDay" INTEGER NOT NULL DEFAULT 2,
    "aiProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_preferences_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "availability_rule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AvailabilityKind" NOT NULL,
    "label" TEXT,
    "days" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "term" TEXT,
    "htmlUrl" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "color" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_meeting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "days" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "AssignmentKind" NOT NULL DEFAULT 'HOMEWORK',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "unlockAt" TIMESTAMP(3),
    "pointsPossible" DOUBLE PRECISION,
    "htmlUrl" TEXT,
    "submissionState" "SubmissionState" NOT NULL DEFAULT 'NONE',
    "removedUpstream" BOOLEAN NOT NULL DEFAULT false,
    "rawHash" TEXT,
    "estimatedMinutes" INTEGER,
    "completedMinutes" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "personalDueAt" TIMESTAMP(3),
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "studentDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_milestone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "completedMinutes" INTEGER NOT NULL DEFAULT 0,
    "doneAt" TIMESTAMP(3),
    "origin" "MilestoneOrigin" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "Source" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "blocksStudy" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "availability_rule_userId_idx" ON "availability_rule"("userId");

-- CreateIndex
CREATE INDEX "course_userId_idx" ON "course"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_id_userId_key" ON "course"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "course_userId_source_externalId_key" ON "course"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "class_meeting_userId_idx" ON "class_meeting"("userId");

-- CreateIndex
CREATE INDEX "class_meeting_courseId_idx" ON "class_meeting"("courseId");

-- CreateIndex
CREATE INDEX "assignment_userId_dueAt_idx" ON "assignment"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "assignment_courseId_idx" ON "assignment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_id_userId_key" ON "assignment"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_userId_source_externalId_key" ON "assignment"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "assignment_milestone_userId_idx" ON "assignment_milestone"("userId");

-- CreateIndex
CREATE INDEX "assignment_milestone_assignmentId_order_idx" ON "assignment_milestone"("assignmentId", "order");

-- CreateIndex
CREATE INDEX "calendar_event_userId_startAt_idx" ON "calendar_event"("userId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_event_userId_source_externalId_key" ON "calendar_event"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "audit_log_userId_createdAt_idx" ON "audit_log"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_preferences" ADD CONSTRAINT "student_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rule" ADD CONSTRAINT "availability_rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_meeting" ADD CONSTRAINT "class_meeting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_meeting" ADD CONSTRAINT "class_meeting_courseId_userId_fkey" FOREIGN KEY ("courseId", "userId") REFERENCES "course"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_courseId_userId_fkey" FOREIGN KEY ("courseId", "userId") REFERENCES "course"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_milestone" ADD CONSTRAINT "assignment_milestone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_milestone" ADD CONSTRAINT "assignment_milestone_assignmentId_userId_fkey" FOREIGN KEY ("assignmentId", "userId") REFERENCES "assignment"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
