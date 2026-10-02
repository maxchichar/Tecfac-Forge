import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Set completion state for a lesson.
 * Enforces that the user has authorization for the course's workspace.
 */
export async function setLessonProgress(
  userId: string,
  lessonId: string,
  completed: boolean
): Promise<{ ok: true; completed: boolean; completedAt: Date | null } | { ok: false; status: number; error: string }> {
  // 1. Authorize: verify user has access to this lesson's workspace
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      module: {
        course: {
          workspace: {
            members: {
              some: { userId },
            },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!lesson) {
    return { ok: false, status: 404, error: "Lesson not found or unauthorized." };
  }

  const completedAt = completed ? new Date() : null;

  const record = await prisma.progress.upsert({
    where: {
      userId_lessonId: {
        userId,
        lessonId,
      },
    },
    update: {
      completed,
      completedAt,
    },
    create: {
      userId,
      lessonId,
      completed,
      completedAt,
    },
  });

  logger.info("progress.updated", {
    userId,
    lessonId,
    completed: record.completed,
  });

  return { ok: true, completed: record.completed, completedAt: record.completedAt };
}

export interface UserDashboardStats {
  completedLessonsCount: number;
  inProgressCoursesCount: number;
  completedCoursesCount: number;
  totalCoursesCount: number;
}

/**
 * Fetch real aggregated stats for the user's dashboard.
 */
export async function getUserDashboardStats(userId: string): Promise<UserDashboardStats> {
  const completedLessonsCount = await prisma.progress.count({
    where: {
      userId,
      completed: true,
    },
  });

  const courses = await prisma.course.findMany({
    where: {
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      modules: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  const completedProgress = await prisma.progress.findMany({
    where: {
      userId,
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedLessonIdSet = new Set(completedProgress.map((p) => p.lessonId));

  let inProgressCoursesCount = 0;
  let completedCoursesCount = 0;

  for (const course of courses) {
    const lessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    if (lessonIds.length === 0) continue;
    const completed = lessonIds.filter((id) => completedLessonIdSet.has(id)).length;
    if (completed === lessonIds.length) {
      completedCoursesCount++;
    } else if (completed > 0) {
      inProgressCoursesCount++;
    }
  }

  return {
    completedLessonsCount,
    inProgressCoursesCount,
    completedCoursesCount,
    totalCoursesCount: courses.length,
  };
}
