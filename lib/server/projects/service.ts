import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAdvance, checkSubmission, milestoneStatus, projectMilestoneTemplate } from "@/lib/projects/policy";
import type { ProjectSubmissionInput } from "@/lib/projects/policy";
import type { ProjectCourseOption, ProjectView } from "@/lib/projects/types";

export class ProjectError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const membership = (userId: string) => ({ workspace: { members: { some: { userId } } } });

async function transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, { timeout: 20_000, maxWait: 15_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
}

export async function getProjectCourseOptions(userId: string): Promise<ProjectCourseOption[]> {
  const courses = await prisma.course.findMany({
    where: membership(userId), orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, title: true, modules: { orderBy: { order: "asc" }, select: {
      lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, sourcePath: true } },
    } } },
  });
  return courses.map((c) => ({ id: c.id, title: c.title, lessons: c.modules.flatMap((m) => m.lessons) }));
}

export async function createLearningProject(userId: string, input: { courseId: string; title: string; outcome: string; sourceIds: string[] }) {
  return transaction(async (tx) => {
    const course = await tx.course.findFirst({ where: { id: input.courseId, ...membership(userId) }, select: { id: true } });
    if (!course) throw new ProjectError(404, "Course not found.");
    const sources = await tx.lesson.findMany({ where: { id: { in: input.sourceIds }, module: { courseId: course.id } }, select: { id: true } });
    if (sources.length !== input.sourceIds.length) throw new ProjectError(400, "Select sources from this course only.");
    const count = await tx.project.count({ where: { courseId: course.id } });
    if (count >= 30) throw new ProjectError(409, "This course has reached its limit of 30 projects.");
    return tx.project.create({
      data: {
        courseId: course.id, slug: randomUUID(), title: input.title, description: input.outcome,
        objectives: [input.outcome], requirements: ["Work locally and submit evidence for every milestone."], hints: [],
        milestones: { create: projectMilestoneTemplate(input.outcome).map((m, order) => ({ ...m, order, sources: { connect: sources } })) },
      }, select: { id: true },
    });
  });
}

export async function getLearningProjects(userId: string, projectId?: string): Promise<ProjectView[]> {
  const projects = await prisma.project.findMany({
    where: { ...(projectId ? { id: projectId } : {}), course: membership(userId) },
    orderBy: { createdAt: "desc" }, take: 50,
    include: {
      course: { select: { id: true, title: true, slug: true, repository: true } },
      milestones: { orderBy: { order: "asc" }, include: {
        sources: { orderBy: { id: "asc" }, select: { id: true, title: true, sourcePath: true, sourceUrl: true, markdown: Boolean(projectId),
          conceptEvidence: { take: 8, select: { concept: { select: { id: true, name: true, description: true } } } },
        } },
        submissions: { where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: projectId ? 5 : 1,
          select: { id: true, status: true, createdAt: true, reviewedAt: true,
            artifact: Boolean(projectId), explanation: Boolean(projectId), verification: Boolean(projectId), criterionEvidence: Boolean(projectId), feedback: Boolean(projectId) },
        },
      } },
    },
  });
  return projects.map((p) => ({
    id: p.id, title: p.title, description: p.description, course: p.course,
    milestones: p.milestones.map((m, index) => ({
      id: m.id, title: m.title, brief: m.brief, order: m.order, criteria: m.criteria,
      status: milestoneStatus(m.submissions[0]?.status, p.milestones.slice(0, index).map((prev) => prev.submissions[0]?.status)),
      sources: m.sources.map((s) => ({ id: s.id, title: s.title, path: s.sourcePath, url: s.sourceUrl,
        excerpt: (s.markdown ?? "").slice(0, 6000), concepts: [...new Map(s.conceptEvidence.map((e) => [e.concept.id, e.concept])).values()] })),
      submissions: m.submissions.map((s) => ({ id: s.id, artifact: s.artifact ?? "", explanation: s.explanation ?? "",
        verification: s.verification ?? "", criterionEvidence: s.criterionEvidence ?? [], status: s.status, feedback: s.feedback ?? "",
        createdAt: s.createdAt.toISOString(), reviewedAt: s.reviewedAt?.toISOString() ?? null })),
    })),
  }));
}

export async function submitProjectMilestone(userId: string, projectId: string, input: ProjectSubmissionInput) {
  return transaction(async (tx) => {
    const milestone = await tx.projectMilestone.findFirst({
      where: { id: input.milestoneId, projectId, project: { course: membership(userId) } },
    });
    if (!milestone) throw new ProjectError(404, "Milestone not found.");
    const predecessors = await tx.projectMilestone.findMany({
      where: { projectId, order: { lt: milestone.order } },
      include: { submissions: { where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } },
    });
    if (!predecessors.every((p) => canAdvance(p.submissions[0]?.status))) {
      throw new ProjectError(409, "Review or self-check the earlier milestones before submitting this one.");
    }
    const result = checkSubmission(input, milestone.criteria);
    return tx.projectSubmission.create({ data: {
      milestoneId: milestone.id, userId, artifact: input.artifact, explanation: input.explanation,
      verification: input.verification, criterionEvidence: input.criterionEvidence, ...result,
    }, select: { id: true, status: true, feedback: true } });
  });
}

export async function getProjectReviewQueue(userId: string) {
  const submissions = await prisma.projectSubmission.findMany({
    where: { userId: { not: userId }, status: { in: ["submitted", "self_checked"] }, milestone: { project: { course: {
      workspace: { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
    } } } }, orderBy: { createdAt: "desc" }, take: 50,
    include: { user: { select: { name: true } }, milestone: { include: { project: { select: { id: true, title: true } } } } },
  });
  // Keep only the current attempt; old evidence remains in the learner's history.
  const latest = await Promise.all(submissions.map((s) => prisma.projectSubmission.findFirst({
    where: { userId: s.userId, milestoneId: s.milestoneId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
  })));
  return submissions.filter((s, i) => latest[i]?.id === s.id).map((s) => ({
    id: s.id, projectId: s.milestone.project.id, projectTitle: s.milestone.project.title,
    milestoneTitle: s.milestone.title, learner: s.user.name, criteria: s.milestone.criteria,
    artifact: s.artifact, explanation: s.explanation, verification: s.verification, criterionEvidence: s.criterionEvidence,
  }));
}

export async function reviewProjectSubmission(userId: string, projectId: string, input: { submissionId: string; status: "accepted" | "needs_revision"; feedback: string }) {
  return transaction(async (tx) => {
    const submission = await tx.projectSubmission.findFirst({
      where: { id: input.submissionId, milestone: { projectId, project: { course: {
        workspace: { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
      } } } },
    });
    if (!submission) throw new ProjectError(404, "Submission not found.");
    if (submission.userId === userId) throw new ProjectError(403, "Independent review requires a different reviewer. Use self-check for your own work.");
    const latest = await tx.projectSubmission.findFirst({
      where: { userId: submission.userId, milestoneId: submission.milestoneId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true },
    });
    if (latest?.id !== submission.id) throw new ProjectError(409, "A newer attempt exists. Refresh before reviewing.");
    if (!["submitted", "self_checked"].includes(submission.status)) throw new ProjectError(409, "This attempt is not awaiting review.");
    return tx.projectSubmission.update({ where: { id: submission.id }, data: {
      status: input.status, feedback: input.feedback, reviewerId: userId, reviewedAt: new Date(),
    }, select: { id: true } });
  });
}
