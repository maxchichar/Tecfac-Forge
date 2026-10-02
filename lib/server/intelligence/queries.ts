import { prisma } from "@/lib/prisma";
import { CourseIntelligenceReport } from "./types";

/**
 * Fetch course intelligence, verifying that the user belongs to the course's workspace.
 */
export async function getAuthorizedCourseIntelligence(
  userId: string,
  courseId: string
): Promise<CourseIntelligenceReport | null> {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    select: { id: true },
  });

  if (!course) {
    return null;
  }

  // Get the latest completed or in-progress analysis run
  const run = await prisma.analysisRun.findFirst({
    where: { courseId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all concepts for this course with nested evidence
  const concepts = await prisma.concept.findMany({
    where: { courseId },
    include: {
      evidence: {
        include: {
          lesson: {
            select: { slug: true },
          },
        },
      },
      fromRelationships: {
        include: {
          targetConcept: { select: { id: true, name: true } },
        },
      },
      toRelationships: {
        include: {
          sourceConcept: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [
      { importance: "asc" },
      { name: "asc" },
    ],
  });

  // Fetch all direct relationships for this course
  const relationships = await prisma.conceptRelationship.findMany({
    where: { courseId },
    include: {
      sourceConcept: { select: { id: true, name: true } },
      targetConcept: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    analysisRun: run
      ? {
          id: run.id,
          status: run.status,
          version: run.version,
          model: run.model,
          errorMessage: run.errorMessage,
          conceptsCount: run.conceptsCount,
          relationshipsCount: run.relationshipsCount,
          durationMs: run.durationMs,
          completedAt: run.completedAt?.toISOString() ?? null,
        }
      : null,
    concepts: concepts.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      importance: c.importance,
      confidence: c.confidence,
      evidence: c.evidence.map((e) => ({
        id: e.id,
        filePath: e.filePath,
        lessonId: e.lessonId,
        lessonSlug: e.lesson?.slug,
        section: e.section,
        excerpt: e.excerpt,
        confidence: e.confidence,
      })),
      prerequisites: c.toRelationships.map((r) => ({
        targetConceptId: r.sourceConcept.id,
        targetConceptName: r.sourceConcept.name,
        type: r.type,
        reason: r.reason,
        confidence: r.confidence,
      })),
      dependents: c.fromRelationships.map((r) => ({
        sourceConceptId: r.targetConcept.id,
        sourceConceptName: r.targetConcept.name,
        type: r.type,
        reason: r.reason,
        confidence: r.confidence,
      })),
    })),
    relationships: relationships.map((r) => ({
      id: r.id,
      sourceConceptId: r.sourceConcept.id,
      sourceConceptName: r.sourceConcept.name,
      targetConceptId: r.targetConcept.id,
      targetConceptName: r.targetConcept.name,
      type: r.type,
      confidence: r.confidence,
      reason: r.reason,
      evidenceExcerpt: r.evidenceExcerpt,
    })),
  };
}
