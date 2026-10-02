import { describe, expect, it, vi } from "vitest";
import { setLessonProgress, getUserDashboardStats } from "@/lib/server/progress";
import { getAuthorizedCourseBySlug } from "@/lib/server/courses";
import { getAuthorizedLessonById } from "@/lib/server/lessons";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lesson: {
      findFirst: vi.fn(),
    },
    progress: {
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    course: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Lesson Progress Persistence", () => {
  it("rejects unauthorized user trying to mark lesson complete", async () => {
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(null);

    const result = await setLessonProgress("intruder-user", "secret-lesson-id", true);
    expect(result).toEqual({ ok: false, status: 404, error: "Lesson not found or unauthorized." });
    expect(prisma.progress.upsert).not.toHaveBeenCalled();
  });

  it("persists progress when user is authorized", async () => {
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue({ id: "valid-lesson" } as unknown as Awaited<ReturnType<typeof prisma.lesson.findFirst>>);
    const date = new Date("2026-09-09T12:00:00Z");
    vi.mocked(prisma.progress.upsert).mockResolvedValue({
      id: "p1",
      userId: "user-1",
      lessonId: "valid-lesson",
      completed: true,
      completedAt: date,
    });

    const result = await setLessonProgress("user-1", "valid-lesson", true);
    expect(result).toEqual({ ok: true, completed: true, completedAt: date });
    expect(prisma.progress.upsert).toHaveBeenCalledWith({
      where: {
        userId_lessonId: {
          userId: "user-1",
          lessonId: "valid-lesson",
        },
      },
      update: {
        completed: true,
        completedAt: expect.any(Date),
      },
      create: {
        userId: "user-1",
        lessonId: "valid-lesson",
        completed: true,
        completedAt: expect.any(Date),
      },
    });
  });
});

describe("Authorized Course Data Access", () => {
  it("returns null when course does not belong to user's workspace", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null);

    const result = await getAuthorizedCourseBySlug("user-1", "other-user-course");
    expect(result).toBeNull();
  });

  it("calculates real completion percentage based on progress records", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      id: "course-1",
      workspaceId: "ws-1",
      slug: "rust-course",
      title: "Rust Course",
      description: "Learn Rust",
      repository: "rust-lang/book",
      language: "Rust",
      difficulty: "intermediate",
      estimatedHours: 4,
      tags: ["rust"],
      projects: [],
      modules: [
        {
          id: "m1",
          courseId: "course-1",
          title: "Module 1",
          order: 1,
          lessons: [
            { id: "l1", moduleId: "m1", slug: "lesson-1", title: "L1", estimatedMinutes: 10, difficulty: "beginner", order: 1 },
            { id: "l2", moduleId: "m1", slug: "lesson-2", title: "L2", estimatedMinutes: 15, difficulty: "beginner", order: 2 },
          ],
        },
      ],
    } as unknown as Awaited<ReturnType<typeof prisma.course.findFirst>>);

    // Only lesson-1 is completed
    vi.mocked(prisma.progress.findMany).mockResolvedValue([{ lessonId: "l1" }] as unknown as Awaited<ReturnType<typeof prisma.progress.findMany>>);

    const result = await getAuthorizedCourseBySlug("user-1", "rust-course");
    expect(result).not.toBeNull();
    // 1 of 2 lessons completed = 50%
    expect(result?.completion).toBe(50);
    expect(result?.modules[0].lessons[0].completed).toBe(true);
    expect(result?.modules[0].lessons[1].completed).toBe(false);
  });
});

describe("User Dashboard Aggregated Stats", () => {
  it("aggregates completed lessons and course statuses", async () => {
    vi.mocked(prisma.progress.count).mockResolvedValue(3);
    vi.mocked(prisma.course.findMany).mockResolvedValue([
      {
        id: "c1",
        modules: [
          {
            lessons: [{ id: "l1" }, { id: "l2" }],
          },
        ],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.course.findMany>>);
    vi.mocked(prisma.progress.findMany).mockResolvedValue([
      { lessonId: "l1" },
    ] as unknown as Awaited<ReturnType<typeof prisma.progress.findMany>>);

    const stats = await getUserDashboardStats("user-1");
    expect(stats.completedLessonsCount).toBe(3);
    expect(stats.inProgressCoursesCount).toBe(1);
    expect(stats.completedCoursesCount).toBe(0);
    expect(stats.totalCoursesCount).toBe(1);
  });
});

describe("AI Tutor Lesson Grounding Access", () => {
  it("returns lesson markdown only if user has access to course workspace", async () => {
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue({
      id: "l1",
      title: "Ownership",
      markdown: "# Ownership Rules",
      module: {
        course: {
          title: "Rust Book",
        },
      },
    } as unknown as Awaited<ReturnType<typeof prisma.lesson.findFirst>>);

    const result = await getAuthorizedLessonById("user-1", "l1");
    expect(result).toEqual({
      id: "l1",
      title: "Ownership",
      markdown: "# Ownership Rules",
      courseTitle: "Rust Book",
    });
  });

  it("returns null if user does not belong to workspace", async () => {
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(null);

    const result = await getAuthorizedLessonById("intruder", "secret-lesson");
    expect(result).toBeNull();
  });
});
