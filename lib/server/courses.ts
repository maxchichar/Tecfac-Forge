import { prisma } from "@/lib/prisma";

export interface CourseWithProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  repository: string | null;
  language: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  tags: string[];
  completion: number; // 0 to 100
  totalLessons: number;
  completedLessons: number;
  moduleIds: string[];
  updatedAt: string;
}

export interface DetailedModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: {
    id: string;
    moduleId: string;
    slug: string;
    title: string;
    estimatedMinutes: number;
    difficulty: "beginner" | "intermediate" | "advanced";
    completed: boolean;
    order: number;
  }[];
}

export interface DetailedCourse {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  description: string;
  repository: string | null;
  language: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedHours: number;
  tags: string[];
  completion: number;
  modules: DetailedModule[];
  projects: {
    id: string;
    slug: string;
    title: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    estimatedHours: number;
  }[];
}

/**
 * Fetch all courses accessible by the user with real progress percentages calculated
 * from the database Progress table.
 */
export async function getAuthorizedCourses(userId: string): Promise<CourseWithProgress[]> {
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
    orderBy: { updatedAt: "desc" },
  });

  if (courses.length === 0) {
    return [];
  }

  // Fetch all completed lessons for this user
  const userProgress = await prisma.progress.findMany({
    where: {
      userId,
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedLessonIds = new Set(userProgress.map((p) => p.lessonId));

  return courses.map((course) => {
    const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
    const totalLessons = allLessonIds.length;
    const completedLessons = allLessonIds.filter((id) => completedLessonIds.has(id)).length;
    const completion = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      repository: course.repository,
      language: course.language,
      difficulty: course.difficulty as "beginner" | "intermediate" | "advanced",
      estimatedHours: course.estimatedHours,
      tags: course.tags,
      completion,
      totalLessons,
      completedLessons,
      moduleIds: course.modules.map((m) => m.id),
      updatedAt: course.updatedAt.toISOString().slice(0, 10),
    };
  });
}

/**
 * Fetch a single course by slug with modules, lessons, and progress for the given user.
 */
export async function getAuthorizedCourseBySlug(
  userId: string,
  slug: string
): Promise<DetailedCourse | null> {
  const course = await prisma.course.findFirst({
    where: {
      slug,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
      projects: true,
    },
  });

  if (!course) {
    return null;
  }

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const userProgress = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: allLessonIds },
      completed: true,
    },
    select: { lessonId: true },
  });

  const completedSet = new Set(userProgress.map((p) => p.lessonId));
  const totalLessons = allLessonIds.length;
  const completedLessons = completedSet.size;
  const completion = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const modules: DetailedModule[] = course.modules.map((mod) => ({
    id: mod.id,
    courseId: mod.courseId,
    title: mod.title,
    order: mod.order,
    lessons: mod.lessons.map((les) => ({
      id: les.id,
      moduleId: les.moduleId,
      slug: les.slug,
      title: les.title,
      estimatedMinutes: les.estimatedMinutes,
      difficulty: les.difficulty as "beginner" | "intermediate" | "advanced",
      completed: completedSet.has(les.id),
      order: les.order,
    })),
  }));

  return {
    id: course.id,
    workspaceId: course.workspaceId,
    slug: course.slug,
    title: course.title,
    description: course.description,
    repository: course.repository,
    language: course.language,
    difficulty: course.difficulty as "beginner" | "intermediate" | "advanced",
    estimatedHours: course.estimatedHours,
    tags: course.tags,
    completion,
    modules,
    projects: course.projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      difficulty: p.difficulty as "beginner" | "intermediate" | "advanced",
      estimatedHours: p.estimatedHours,
    })),
  };
}
