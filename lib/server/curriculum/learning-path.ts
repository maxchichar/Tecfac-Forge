import { prisma } from "@/lib/prisma";
import { computeCurriculumOrder, ConceptOrderingInput, RelationshipOrderingInput } from "./ordering";
import { deriveLearningObjective } from "./objectives";
import { ConceptImportance, MasteryState } from "@prisma/client";

export interface AssociatedLessonSummary {
  id: string;
  slug: string;
  title: string;
}

export interface PrerequisiteRef {
  id: string;
  name: string;
  slug: string;
  isCompleted: boolean;
  masteryState: MasteryState;
}

export interface LearningPathNode {
  conceptId: string;
  sequenceOrder: number;
  name: string;
  slug: string;
  description: string;
  importance: ConceptImportance;
  confidence: number;
  learningObjective: string;
  associatedLesson: AssociatedLessonSummary | null;
  evidenceFilePath: string | null;
  evidenceSnippet: string | null;
  isCompleted: boolean;
  isAvailable: boolean;
  isLocked: boolean;
  canAssess: boolean;
  masteryState: MasteryState;
  blockingPrerequisiteNames: string[];
  prerequisites: PrerequisiteRef[];
  depth: number;
  practiceStats: {
    attemptsCount: number;
    bestScore: number;
    passed: boolean;
  };
}

export interface CourseLearningPathReport {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalConcepts: number;
  completedConcepts: number;
  demonstratedConcepts: number;
  masteredConcepts: number;
  availableConcepts: number;
  lockedConcepts: number;
  nextRecommendedConceptId: string | null;
  hasCycle: boolean;
  nodes: LearningPathNode[];
}

/**
 * Resolves the authorized, source-grounded curriculum path and learning progress state
 * for a course and user.
 */
export async function getAuthorizedLearningPath(
  userId: string,
  courseId: string
): Promise<CourseLearningPathReport | null> {
  // 1. Authorize: user must belong to the course's workspace
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
      concepts: {
        include: {
          evidence: {
            include: {
              lesson: {
                select: { id: true, slug: true, title: true, order: true },
              },
            },
          },
        },
      },
      conceptRelationships: true,
      modules: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) return null;

  if (course.concepts.length === 0) {
    return {
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
      totalConcepts: 0,
      completedConcepts: 0,
      demonstratedConcepts: 0,
      masteredConcepts: 0,
      availableConcepts: 0,
      lockedConcepts: 0,
      nextRecommendedConceptId: null,
      hasCycle: false,
      nodes: [],
    };
  }

  // 2. Fetch user's completed lesson progress in this course
  const courseLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completedProgress = await prisma.progress.findMany({
    where: {
      userId,
      lessonId: { in: courseLessonIds },
      completed: true,
    },
    select: { lessonId: true },
  });
  const completedLessonIdSet = new Set(completedProgress.map((p) => p.lessonId));

  // 3. Fetch user's practice attempts for this course's concepts
  const conceptIds = course.concepts.map((c) => c.id);
  const practiceAttempts = await prisma.practiceAttempt.findMany({
    where: {
      userId,
      conceptId: { in: conceptIds },
    },
    select: {
      conceptId: true,
      passed: true,
      score: true,
    },
  });

  const practiceStatsMap = new Map<string, { attemptsCount: number; bestScore: number; passed: boolean }>();
  for (const cid of conceptIds) {
    practiceStatsMap.set(cid, { attemptsCount: 0, bestScore: 0, passed: false });
  }
  for (const att of practiceAttempts) {
    const stat = practiceStatsMap.get(att.conceptId)!;
    stat.attemptsCount += 1;
    if (att.score > stat.bestScore) stat.bestScore = att.score;
    if (att.passed) stat.passed = true;
  }

  // 3b. Fetch user's concept mastery records
  const conceptMasteries = await prisma.conceptMastery.findMany({
    where: {
      userId,
      conceptId: { in: conceptIds },
    },
    select: {
      conceptId: true,
      state: true,
      bestScore: true,
    },
  });

  const masteryMap = new Map<string, MasteryState>(
    conceptMasteries.map((m) => [m.conceptId, m.state])
  );

  // 4. Prepare ordering input
  const orderingConcepts: ConceptOrderingInput[] = course.concepts.map((c) => {
    // Find min lesson order among evidence items as an order hint
    const minOrder = c.evidence.reduce<number>((min, ev) => {
      const order = ev.lesson?.order ?? 9999;
      return order < min ? order : min;
    }, 9999);

    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      importance: c.importance,
      confidence: c.confidence,
      orderHint: minOrder === 9999 ? undefined : minOrder,
    };
  });

  const orderingRels: RelationshipOrderingInput[] = course.conceptRelationships.map((r) => ({
    sourceConceptId: r.sourceConceptId,
    targetConceptId: r.targetConceptId,
    type: r.type,
    confidence: r.confidence,
  }));

  // 5. Compute deterministic curriculum order
  const { orderedConcepts, hasCycle } = computeCurriculumOrder(orderingConcepts, orderingRels);

  const conceptEntityMap = new Map(course.concepts.map((c) => [c.id, c]));

  // 6. First pass: Determine completion state of each concept
  const completedConceptIdSet = new Set<string>();

  for (const item of orderedConcepts) {
    const raw = conceptEntityMap.get(item.concept.id)!;
    const practiceStat = practiceStatsMap.get(raw.id)!;
    const storedMastery = masteryMap.get(raw.id);

    const associatedLesson = raw.evidence.find((ev) => ev.lesson)?.lesson ?? null;
    const lessonId = associatedLesson?.id ?? raw.evidence.find((ev) => ev.lessonId)?.lessonId ?? null;
    const isLessonCompleted = lessonId ? completedLessonIdSet.has(lessonId) : false;

    let conceptState: MasteryState = storedMastery ?? "not_started";
    if (!storedMastery) {
      if (practiceStat.passed) {
        conceptState = "demonstrated";
      } else if (practiceStat.attemptsCount > 0 || isLessonCompleted) {
        conceptState = "learning";
      }
    }

    const isCompleted =
      conceptState === "demonstrated" ||
      conceptState === "mastered" ||
      practiceStat.passed ||
      isLessonCompleted;

    if (isCompleted) {
      completedConceptIdSet.add(raw.id);
    }
  }

  // 7. Second pass: Calculate availability, blocked prerequisites, and construct nodes
  const nodes: LearningPathNode[] = [];
  let nextRecommendedConceptId: string | null = null;
  let completedCount = 0;
  let demonstratedCount = 0;
  let masteredCount = 0;
  let availableCount = 0;
  let lockedCount = 0;

  for (const item of orderedConcepts) {
    const raw = conceptEntityMap.get(item.concept.id)!;
    const practiceStat = practiceStatsMap.get(raw.id)!;
    const isCompleted = completedConceptIdSet.has(raw.id);
    const storedMastery = masteryMap.get(raw.id);

    // Resolve associated lesson & evidence snippet
    const evidenceWithLesson = raw.evidence.find((ev) => ev.lesson);
    const primaryEvidence = evidenceWithLesson || raw.evidence[0] || null;

    const associatedLesson: AssociatedLessonSummary | null = evidenceWithLesson?.lesson
      ? {
          id: evidenceWithLesson.lesson.id,
          slug: evidenceWithLesson.lesson.slug,
          title: evidenceWithLesson.lesson.title,
        }
      : null;

    const evidenceFilePath = primaryEvidence?.filePath || null;
    const evidenceSnippet = primaryEvidence?.excerpt || null;

    // Prerequisite refs
    const prerequisites: PrerequisiteRef[] = item.prerequisiteIds.map((pId) => {
      const pConcept = conceptEntityMap.get(pId)!;
      const pStored = masteryMap.get(pId);
      const pState: MasteryState = pStored ?? (completedConceptIdSet.has(pId) ? "demonstrated" : "not_started");
      return {
        id: pConcept.id,
        name: pConcept.name,
        slug: pConcept.slug,
        isCompleted: completedConceptIdSet.has(pId),
        masteryState: pState,
      };
    });

    const blockingPrereqs = prerequisites.filter((p) => !p.isCompleted);
    const isAvailable = blockingPrereqs.length === 0;
    const isLocked = !isAvailable;

    // canAssess requires all prerequisites to be at least learning or demonstrated
    const unsatisfiedAssessmentPrereqs = prerequisites.filter((p) => p.masteryState === "not_started");
    const canAssess = unsatisfiedAssessmentPrereqs.length === 0;

    let nodeMastery: MasteryState = storedMastery ?? "not_started";
    if (!storedMastery) {
      if (practiceStat.passed) {
        nodeMastery = "demonstrated";
      } else if (practiceStat.attemptsCount > 0 || isCompleted) {
        nodeMastery = "learning";
      }
    }

    if (nodeMastery === "mastered") {
      masteredCount++;
      demonstratedCount++;
    } else if (nodeMastery === "demonstrated") {
      demonstratedCount++;
    }

    if (isCompleted) {
      completedCount++;
    } else if (isAvailable) {
      availableCount++;
      if (!nextRecommendedConceptId) {
        nextRecommendedConceptId = raw.id;
      }
    } else {
      lockedCount++;
    }

    const learningObjective = deriveLearningObjective(raw.name, raw.description, evidenceSnippet);

    nodes.push({
      conceptId: raw.id,
      sequenceOrder: item.sequenceOrder,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      importance: raw.importance,
      confidence: raw.confidence,
      learningObjective,
      associatedLesson,
      evidenceFilePath,
      evidenceSnippet,
      isCompleted,
      isAvailable,
      isLocked,
      canAssess,
      masteryState: nodeMastery,
      blockingPrerequisiteNames: blockingPrereqs.map((p) => p.name),
      prerequisites,
      depth: item.depth,
      practiceStats: practiceStat,
    });
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
    courseSlug: course.slug,
    totalConcepts: nodes.length,
    completedConcepts: completedCount,
    demonstratedConcepts: demonstratedCount,
    masteredConcepts: masteredCount,
    availableConcepts: availableCount,
    lockedConcepts: lockedCount,
    nextRecommendedConceptId,
    hasCycle,
    nodes,
  };
}
