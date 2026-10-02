import { prisma } from "@/lib/prisma";

const access = (userId: string) => ({ module: { course: { workspace: { members: { some: { userId } } } } } });
export class LibraryAccessError extends Error {}

export async function getLessonLibrary(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, ...access(userId) }, select: { id: true } });
  if (!lesson) throw new LibraryAccessError("Lesson not found.");
  const [note, bookmark] = await Promise.all([
    prisma.note.findFirst({ where: { userId, lessonId }, orderBy: { updatedAt: "desc" } }),
    prisma.bookmark.findFirst({ where: { userId, lessonId, type: "lesson" } }),
  ]);
  return { content: note?.content ?? "", bookmarked: Boolean(bookmark) };
}

export async function saveLessonLibrary(userId: string, lessonId: string, input: { content?: string; bookmarked?: boolean }) {
  return prisma.$transaction(async (tx) => {
    // Serializes saves from multiple tabs without adding a uniqueness constraint to legacy notes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`library:${userId}:${lessonId}`}))::text`;
    const lesson = await tx.lesson.findFirst({ where: { id: lessonId, ...access(userId) }, select: { id: true } });
    if (!lesson) throw new LibraryAccessError("Lesson not found.");
    if (input.content !== undefined) {
      const existing = await tx.note.findFirst({ where: { userId, lessonId }, orderBy: { updatedAt: "desc" } });
      if (existing) await tx.note.update({ where: { id: existing.id }, data: { content: input.content } });
      else if (input.content.trim()) await tx.note.create({ data: { userId, lessonId, content: input.content } });
    }
    if (input.bookmarked !== undefined) {
      if (!input.bookmarked) await tx.bookmark.deleteMany({ where: { userId, lessonId, type: "lesson" } });
      else if (!await tx.bookmark.findFirst({ where: { userId, lessonId, type: "lesson" } })) {
        await tx.bookmark.create({ data: { userId, lessonId, type: "lesson" } });
      }
    }
  }, { timeout: 20_000, maxWait: 15_000 });
}

export async function getPersonalNotes(userId: string) {
  return prisma.note.findMany({ where: { userId, content: { not: "" }, lesson: access(userId) }, include: { lesson: { select: { slug: true, title: true, module: { select: { course: { select: { title: true } } } } } } }, orderBy: { updatedAt: "desc" }, take: 100 });
}
export async function getPersonalBookmarks(userId: string) {
  return prisma.bookmark.findMany({ where: { userId, type: "lesson", lesson: access(userId) }, include: { lesson: { select: { slug: true, title: true, module: { select: { course: { select: { title: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 100 });
}
export async function searchLibrary(userId: string, query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];
  const [lessons, projects, notes] = await Promise.all([
    prisma.lesson.findMany({ where: { ...access(userId), OR: [{ title: { contains: q, mode: "insensitive" } }, { markdown: { contains: q, mode: "insensitive" } }] }, select: { id: true, title: true, slug: true }, take: 20, orderBy: { title: "asc" } }),
    prisma.project.findMany({ where: { course: { workspace: { members: { some: { userId } } } }, OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }, select: { id: true, title: true }, take: 20, orderBy: { title: "asc" } }),
    prisma.note.findMany({ where: { userId, lesson: access(userId), content: { contains: q, mode: "insensitive" } }, select: { id: true, lesson: { select: { title: true, slug: true } } }, take: 20, orderBy: { updatedAt: "desc" } }),
  ]);
  return [...lessons.map(x => ({ id: x.id, title: x.title, type: "Source", href: `/lesson/${x.slug}` })), ...projects.map(x => ({ id: x.id, title: x.title, type: "Project", href: `/project/${x.id}` })), ...notes.map(x => ({ id: x.id, title: x.lesson.title, type: "Note", href: `/lesson/${x.lesson.slug}#personal-notes` }))];
}
