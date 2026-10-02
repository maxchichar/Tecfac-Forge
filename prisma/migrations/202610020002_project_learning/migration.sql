BEGIN;

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('needs_revision', 'submitted', 'self_checked', 'accepted');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "sourcePath" TEXT,
ADD COLUMN     "sourceRevision" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "criteria" TEXT[],

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artifact" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "verification" TEXT NOT NULL,
    "criterionEvidence" TEXT[],
    "status" "SubmissionStatus" NOT NULL,
    "feedback" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LessonToProjectMilestone" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LessonToProjectMilestone_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMilestone_projectId_order_key" ON "ProjectMilestone"("projectId", "order");

-- CreateIndex
CREATE INDEX "ProjectSubmission_userId_milestoneId_createdAt_idx" ON "ProjectSubmission"("userId", "milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectSubmission_milestoneId_status_idx" ON "ProjectSubmission"("milestoneId", "status");

-- CreateIndex
CREATE INDEX "_LessonToProjectMilestone_B_index" ON "_LessonToProjectMilestone"("B");

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LessonToProjectMilestone" ADD CONSTRAINT "_LessonToProjectMilestone_A_fkey" FOREIGN KEY ("A") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LessonToProjectMilestone" ADD CONSTRAINT "_LessonToProjectMilestone_B_fkey" FOREIGN KEY ("B") REFERENCES "ProjectMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
