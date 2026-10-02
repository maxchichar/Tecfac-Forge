import { prisma } from "@/lib/prisma";

export interface AdjacentLessonInfo {
  slug: string;
  title: string;
}

export interface DetailedLesson {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  markdown: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  completed: boolean;
  order: number;
  course: {
    id: string;
    slug: string;
    title: string;
  };
  prev: AdjacentLessonInfo | null;
  next: AdjacentLessonInfo | null;
}

/**
 * Fetch a single lesson by slug, verifying user has authorization to access the course's workspace.
 */
export async function getAuthorizedLessonBySlug(
  userId: string,
  slug: string
): Promise<DetailedLesson | null> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      slug,
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
    include: {
      module: {
        include: {
          course: {
            select: {
              id: true,
              slug: true,
              title: true,
              modules: {
                orderBy: { order: "asc" },
                include: {
                  lessons: {
                    orderBy: { order: "asc" },
                    select: { id: true, slug: true, title: true, order: true, moduleId: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    return null;
  }

  // Check user progress for this lesson
  const progress = await prisma.progress.findUnique({
    where: {
      userId_lessonId: {
        userId,
        lessonId: lesson.id,
      },
    },
  });

  // Calculate adjacent lessons across the entire course
  const allCourseLessons = lesson.module.course.modules.flatMap((m) => m.lessons);
  const currentIndex = allCourseLessons.findIndex((l) => l.id === lesson.id);

  const prev = currentIndex > 0 ? { slug: allCourseLessons[currentIndex - 1].slug, title: allCourseLessons[currentIndex - 1].title } : null;
  const next = currentIndex !== -1 && currentIndex < allCourseLessons.length - 1
    ? { slug: allCourseLessons[currentIndex + 1].slug, title: allCourseLessons[currentIndex + 1].title }
    : null;

    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      slug: lesson.slug,
      title: lesson.title,
      markdown: lesson.markdown,
      estimatedMinutes: lesson.estimatedMinutes,
      difficulty: lesson.difficulty as "beginner" | "intermediate" | "advanced",
      completed: progress?.completed ?? false,
      order: lesson.order,
      course: {
        id: lesson.module.course.id,
        slug: lesson.module.course.slug,
        title: lesson.module.course.title,
      },
      prev,
      next,
    };
}

/**
 * Fetch a lesson by ID, verifying workspace authorization for the AI tutor.
 */
export async function getAuthorizedLessonById(
  userId: string,
  lessonId: string
): Promise<{ id: string; title: string; markdown: string; courseTitle: string } | null> {
  try {
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
      include: {
        module: {
          include: {
            course: {
              select: { title: true },
            },
          },
        },
      },
    });

    if (!lesson) return null;

    return {
      id: lesson.id,
      title: lesson.title,
      markdown: lesson.markdown,
      courseTitle: lesson.module.course.title,
    };
  } catch {
    return null;
  }
}
