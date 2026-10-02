import { prisma } from "@/lib/prisma";
import { logger, safeErrorMessage } from "@/lib/logger";
import {
  SourceUnit,
  extractLocalCandidatesFromUnit,
  synthesizeConceptsAndRelationships,
  enrichExtractionWithOpenAI,
  normalizeConceptSlug,
} from "./extractor";
import { CourseIntelligenceReport } from "./types";
import { getAuthorizedCourseIntelligence } from "./queries";

export const ANALYSIS_VERSION = "1.0.0";

export interface AnalyzeOptions {
  force?: boolean;
  fetchFn?: typeof fetch;
}

/**
 * Execute the P2 Source Intelligence extraction pipeline for a course.
 *
 * Guarantees:
 * - Idempotency: re-running without force=true returns existing completed analysis immediately.
 * - Atomicity: concepts, evidence, and relationships are persisted in a single transaction.
 * - Failure safety: failed runs are explicitly recorded as status: "failed" and never return partial data.
 */
export async function analyzeCourseIntelligence(
  userId: string,
  courseId: string,
  options: AnalyzeOptions = {}
): Promise<{ ok: true; report: CourseIntelligenceReport } | { ok: false; status: number; error: string }> {
  const startTime = Date.now();

  // 1. Authorize: verify course exists and user is a member of the workspace
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
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
    },
  });

  if (!course) {
    return { ok: false, status: 404, error: "Course not found or unauthorized." };
  }

  // 2. Idempotency check: return existing completed analysis unless force=true
  if (!options.force) {
    const existingRun = await prisma.analysisRun.findFirst({
      where: {
        courseId,
        version: ANALYSIS_VERSION,
        status: "completed",
      },
    });

    if (existingRun) {
      logger.info("intelligence.analysis_already_completed", { courseId, runId: existingRun.id });
      const report = await getAuthorizedCourseIntelligence(userId, courseId);
      if (report) return { ok: true, report };
    }
  }

  let analysisRunId: string | null = null;

  try {
    // 3. Initialize or update AnalysisRun record to "processing"
    const analysisRun = await prisma.analysisRun.create({
      data: {
        courseId,
        workspaceId: course.workspaceId,
        status: "processing",
        version: ANALYSIS_VERSION,
        model: process.env.OPENAI_API_KEY ? (process.env.OPENAI_MODEL || "gpt-4o-mini") : "ast-deterministic",
        sourceRevision: course.repository || "local",
      },
    });
    analysisRunId = analysisRun.id;
    // 4. Flatten lessons into SourceUnits
    const units: SourceUnit[] = course.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        markdown: lesson.markdown,
        moduleTitle: mod.title,
        order: lesson.order,
        filePath: `${lesson.slug}.md`,
      }))
    );

    if (units.length === 0) {
      await prisma.analysisRun.update({
        where: { id: analysisRun.id },
        data: {
          status: "failed",
          errorMessage: "Course contains no lessons or markdown content to analyze.",
          completedAt: new Date(),
        },
      });
      return { ok: false, status: 422, error: "Course has no lessons to analyze." };
    }

    // 5. Two-Stage Extraction
    // Stage A: Local candidate extraction across units
    const candidateConcepts = units.flatMap((unit) => extractLocalCandidatesFromUnit(unit));

    // Stage B: Synthesis, deduplication, and relationship inference
    const synthesized = synthesizeConceptsAndRelationships(candidateConcepts, units);

    // Optional Stage C: AI enrichment if API key is present
    const finalOutput = await enrichExtractionWithOpenAI(synthesized, units, options.fetchFn);

    // Map units by slug/title to associate evidence with real lesson IDs
    const unitMap = new Map<string, string>();
    for (const unit of units) {
      unitMap.set(unit.slug, unit.id);
      unitMap.set(unit.title.toLowerCase(), unit.id);
    }

    // 6. Atomic Database Persistence
    await prisma.$transaction(
      async (tx) => {
        // Clear previous concepts and relationships for this course to ensure clean idempotency
        await tx.conceptRelationship.deleteMany({ where: { courseId } });
        await tx.concept.deleteMany({ where: { courseId } });

        // Create concepts with nested evidence in concurrency-bounded batches
        const createdConceptsMap = new Map<string, string>(); // canonical slug -> concept.id
        const CONCEPT_BATCH_SIZE = 10;

        for (let i = 0; i < finalOutput.concepts.length; i += CONCEPT_BATCH_SIZE) {
          const batch = finalOutput.concepts.slice(i, i + CONCEPT_BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (c) => {
              const slug = normalizeConceptSlug(c.name);
              const created = await tx.concept.create({
                data: {
                  courseId,
                  workspaceId: course.workspaceId,
                  name: c.name,
                  slug,
                  description: c.description,
                  importance: c.importance,
                  confidence: c.confidence,
                  evidence: {
                    create: c.evidence.map((ev) => {
                      const matchedLessonId =
                        unitMap.get(ev.filePath.replace(/\.md$/, "")) ||
                        unitMap.get(ev.section.toLowerCase()) ||
                        null;

                      return {
                        filePath: ev.filePath,
                        section: ev.section || null,
                        excerpt: ev.excerpt,
                        confidence: ev.confidence,
                        lessonId: matchedLessonId,
                      };
                    }),
                  },
                },
              });
              return { c, slug, id: created.id };
            })
          );

          for (const res of results) {
            createdConceptsMap.set(res.slug, res.id);
            createdConceptsMap.set(res.c.name.toLowerCase(), res.id);
          }
        }

        // Create relationships linking concepts in a single batch query
        const relData: Array<{
          courseId: string;
          sourceConceptId: string;
          targetConceptId: string;
          type: (typeof finalOutput.relationships)[number]["type"];
          confidence: number;
          reason: string | null;
          evidenceExcerpt: string | null;
        }> = [];

        const seenPairs = new Set<string>();

        for (const rel of finalOutput.relationships) {
          const sourceId =
            createdConceptsMap.get(normalizeConceptSlug(rel.sourceConceptName)) ||
            createdConceptsMap.get(rel.sourceConceptName.toLowerCase());
          const targetId =
            createdConceptsMap.get(normalizeConceptSlug(rel.targetConceptName)) ||
            createdConceptsMap.get(rel.targetConceptName.toLowerCase());

          if (sourceId && targetId && sourceId !== targetId) {
            const pairKey = `${sourceId}:${targetId}:${rel.type}`;
            if (!seenPairs.has(pairKey)) {
              seenPairs.add(pairKey);
              relData.push({
                courseId,
                sourceConceptId: sourceId,
                targetConceptId: targetId,
                type: rel.type,
                confidence: rel.confidence,
                reason: rel.reason || null,
                evidenceExcerpt: rel.evidenceExcerpt || null,
              });
            }
          }
        }

        if (relData.length > 0) {
          await tx.conceptRelationship.createMany({
            data: relData,
            skipDuplicates: true,
          });
        }

        // Update AnalysisRun record
        const durationMs = Date.now() - startTime;
        await tx.analysisRun.update({
          where: { id: analysisRun.id },
          data: {
            status: "completed",
            conceptsCount: finalOutput.concepts.length,
            relationshipsCount: relData.length,
            durationMs,
            completedAt: new Date(),
          },
        });
      },
      { timeout: 120_000, maxWait: 15_000 }
    );

    logger.info("intelligence.analysis_completed", {
      courseId,
      runId: analysisRun.id,
      concepts: finalOutput.concepts.length,
      relationships: finalOutput.relationships.length,
      durationMs: Date.now() - startTime,
    });

    const report = await getAuthorizedCourseIntelligence(userId, courseId);
    if (!report) {
      return { ok: false, status: 500, error: "Failed to retrieve intelligence report." };
    }

    return { ok: true, report };
  } catch (err) {
    logger.error("intelligence.analysis_failed", {
      courseId,
      runId: analysisRunId ?? "unknown",
      message: safeErrorMessage(err),
    });

    if (analysisRunId) {
      await prisma.analysisRun.update({
        where: { id: analysisRunId },
        data: {
          status: "failed",
          errorMessage: safeErrorMessage(err).slice(0, 500),
          completedAt: new Date(),
        },
      });
    }

    return { ok: false, status: 500, error: "Course intelligence extraction failed." };
  }
}
