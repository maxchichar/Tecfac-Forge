BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('github', 'zip', 'markdown_folder', 'gitbook', 'docusaurus', 'mintlify', 'html');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('not_started', 'in_progress', 'submitted', 'reviewed');

-- CreateEnum
CREATE TYPE "BookmarkType" AS ENUM ('lesson', 'project', 'section');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ConceptImportance" AS ENUM ('foundational', 'core', 'advanced');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('prerequisite', 'depends_on', 'related_to', 'implements', 'uses');

-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('practice', 'assessment');

-- CreateEnum
CREATE TYPE "MasteryState" AS ENUM ('not_started', 'learning', 'demonstrated', 'mastered');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "repository" TEXT,
    "language" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'beginner',
    "estimatedHours" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "importSource" "ImportSource" NOT NULL DEFAULT 'github',
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'beginner',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'not_started',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'beginner',
    "estimatedHours" INTEGER NOT NULL DEFAULT 1,
    "objectives" TEXT[],
    "requirements" TEXT[],
    "hints" TEXT[],

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BookmarkType" NOT NULL,
    "lessonId" TEXT,
    "projectId" TEXT,
    "sectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "choices" TEXT[],
    "answer" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'pending',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "model" TEXT,
    "sourceRevision" TEXT,
    "errorMessage" TEXT,
    "conceptsCount" INTEGER NOT NULL DEFAULT 0,
    "relationshipsCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "importance" "ConceptImportance" NOT NULL DEFAULT 'core',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptEvidence" (
    "id" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lessonId" TEXT,
    "section" TEXT,
    "excerpt" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptRelationship" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sourceConceptId" TEXT NOT NULL,
    "targetConceptId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL DEFAULT 'related_to',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reason" TEXT,
    "evidenceExcerpt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "AttemptType" NOT NULL DEFAULT 'practice',
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT NOT NULL,
    "strengths" TEXT[],
    "missing" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "state" "MasteryState" NOT NULL DEFAULT 'not_started',
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attemptsCount" INTEGER NOT NULL DEFAULT 0,
    "demonstratedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConceptMastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_workspaceId_repository_key" ON "Course"("workspaceId", "repository");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_moduleId_slug_key" ON "Lesson"("moduleId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Project_courseId_slug_key" ON "Project"("courseId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_lessonId_key" ON "Progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "AnalysisRun_courseId_idx" ON "AnalysisRun"("courseId");

-- CreateIndex
CREATE INDEX "AnalysisRun_workspaceId_idx" ON "AnalysisRun"("workspaceId");

-- CreateIndex
CREATE INDEX "Concept_courseId_idx" ON "Concept"("courseId");

-- CreateIndex
CREATE INDEX "Concept_workspaceId_idx" ON "Concept"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Concept_courseId_slug_key" ON "Concept"("courseId", "slug");

-- CreateIndex
CREATE INDEX "ConceptEvidence_conceptId_idx" ON "ConceptEvidence"("conceptId");

-- CreateIndex
CREATE INDEX "ConceptEvidence_lessonId_idx" ON "ConceptEvidence"("lessonId");

-- CreateIndex
CREATE INDEX "ConceptRelationship_courseId_idx" ON "ConceptRelationship"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptRelationship_sourceConceptId_targetConceptId_type_key" ON "ConceptRelationship"("sourceConceptId", "targetConceptId", "type");

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_conceptId_idx" ON "PracticeAttempt"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_workspaceId_idx" ON "PracticeAttempt"("workspaceId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_userId_type_idx" ON "PracticeAttempt"("userId", "type");

-- CreateIndex
CREATE INDEX "ConceptMastery_workspaceId_idx" ON "ConceptMastery"("workspaceId");

-- CreateIndex
CREATE INDEX "ConceptMastery_userId_state_idx" ON "ConceptMastery"("userId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptMastery_userId_conceptId_key" ON "ConceptMastery"("userId", "conceptId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progress" ADD CONSTRAINT "Progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEvidence" ADD CONSTRAINT "ConceptEvidence_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptEvidence" ADD CONSTRAINT "ConceptEvidence_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelationship" ADD CONSTRAINT "ConceptRelationship_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelationship" ADD CONSTRAINT "ConceptRelationship_sourceConceptId_fkey" FOREIGN KEY ("sourceConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptRelationship" ADD CONSTRAINT "ConceptRelationship_targetConceptId_fkey" FOREIGN KEY ("targetConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAttempt" ADD CONSTRAINT "PracticeAttempt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMastery" ADD CONSTRAINT "ConceptMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMastery" ADD CONSTRAINT "ConceptMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConceptMastery" ADD CONSTRAINT "ConceptMastery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
