import { prisma } from "@/lib/prisma";
import { generateAssessmentPrompt, evaluateAssessmentSubmission } from "./evaluator";
import { AssessmentPrompt, AssessmentEvaluationResult, ConceptMasteryReport, PrerequisiteMasteryRef } from "./types";
import { deriveLearningObjective } from "@/lib/server/curriculum/objectives";
import { MasteryState } from "@prisma/client";
import { evaluateMasteryPolicy } from "./mastery";
import { logger } from "@/lib/logger";

/**
 * Retrieves the authorized assessment prompt and prerequisite readiness for a concept.
 */
export async function getAuthorizedConceptAssessment(
  userId: string,
  conceptId: string
): Promise<AssessmentPrompt | null> {
  // 1. Authorize & fetch concept with workspace membership
  const concept = await prisma.concept.findFirst({
    where: {
      id: conceptId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      evidence: {
        include: {
          lesson: {
            select: { id: true, slug: true, title: true },
          },
        },
      },
      // Target concept has fromRelationships where this concept is target and source is prerequisite
      toRelationships: {
        where: {
          type: { in: ["prerequisite", "depends_on"] },
          confidence: { gte: 0.5 },
        },
        include: {
          sourceConcept: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!concept) return null;

  const primaryEvidence = concept.evidence[0];
  if (!primaryEvidence) return null;

  const learningObjective = deriveLearningObjective(
    concept.name,
    concept.description,
    primaryEvidence.excerpt
  );

  // 2. Fetch prerequisite concepts' mastery state
  const prereqConceptIds = concept.toRelationships.map((r) => r.sourceConcept.id);
  const prereqMasteries = await prisma.conceptMastery.findMany({
    where: {
      userId,
      conceptId: { in: prereqConceptIds },
    },
  });

  const prereqMasteryMap = new Map<string, MasteryState>(
    prereqMasteries.map((m) => [m.conceptId, m.state])
  );

  const prerequisites: PrerequisiteMasteryRef[] = concept.toRelationships.map((r) => {
    const state = prereqMasteryMap.get(r.sourceConcept.id) ?? "not_started";
    return {
      id: r.sourceConcept.id,
      name: r.sourceConcept.name,
      slug: r.sourceConcept.slug,
      state,
      isSatisfied: state === "demonstrated" || state === "mastered",
    };
  });

  // 3. Fetch current concept's mastery state
  const currentMastery = await prisma.conceptMastery.findUnique({
    where: {
      userId_conceptId: { userId, conceptId: concept.id },
    },
  });

  let currentMasteryState: MasteryState = currentMastery?.state ?? "not_started";

  // If not_started but associated lesson is completed, default to learning
  if (currentMasteryState === "not_started" && concept.evidence.length > 0) {
    const lessonIds = concept.evidence
      .map((ev) => ev.lessonId)
      .filter((id): id is string => Boolean(id));

    if (lessonIds.length > 0) {
      const completedCount = await prisma.progress.count({
        where: {
          userId,
          lessonId: { in: lessonIds },
          completed: true,
        },
      });
      if (completedCount > 0) {
        currentMasteryState = "learning";
      }
    }
  }

  return generateAssessmentPrompt(
    {
      id: concept.id,
      name: concept.name,
      slug: concept.slug,
      description: concept.description,
      importance: concept.importance,
    },
    learningObjective,
    {
      filePath: primaryEvidence.filePath,
      section: primaryEvidence.section,
      excerpt: primaryEvidence.excerpt,
    },
    prerequisites,
    currentMasteryState
  );
}

/**
 * Evaluates, records, and updates mastery atomically for an authorized assessment submission.
 */
export async function submitAuthorizedAssessmentAttempt(
  userId: string,
  conceptId: string,
  response: string,
  fetchFn?: typeof fetch
): Promise<
  | { ok: true; evaluation: AssessmentEvaluationResult; attemptId: string }
  | { ok: false; status: number; error: string }
> {
  // 1. Authorize and fetch prompt context
  const prompt = await getAuthorizedConceptAssessment(userId, conceptId);
  if (!prompt) {
    return { ok: false, status: 404, error: "Concept not found or unauthorized." };
  }

  // 2. Fetch prior assessment attempts count
  const priorAttempts = await prisma.practiceAttempt.findMany({
    where: {
      userId,
      conceptId,
      type: "assessment",
    },
    select: { passed: true },
  });

  const priorAttemptsCount = priorAttempts.length;
  const priorPassedCount = priorAttempts.filter((a) => a.passed).length;

  // 3. Evaluate submission
  let evaluation: AssessmentEvaluationResult;
  try {
    evaluation = await evaluateAssessmentSubmission(prompt, response, priorAttemptsCount, priorPassedCount, fetchFn);
  } catch {
    return { ok: false, status: 503, error: "Assessment feedback is temporarily unavailable. Your response has not been graded; please retry." };
  }

  // 4. Fetch concept workspaceId for tenancy
  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
    select: { workspaceId: true },
  });

  if (!concept) {
    return { ok: false, status: 404, error: "Concept record not found." };
  }

  // 5. Persist attempt and update ConceptMastery atomically in PostgreSQL
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`assessment:${userId}:${conceptId}`}))::text`;
    const current = await tx.conceptMastery.findUnique({ where: { userId_conceptId: { userId, conceptId } } });
    const passedCount = await tx.practiceAttempt.count({ where: { userId, conceptId, type: "assessment", passed: true } });
    const policy = evaluateMasteryPolicy({ currentState: current?.state ?? prompt.currentMasteryState, assessmentPassed: evaluation.passed, assessmentScore: evaluation.score, priorAttemptsCount: current?.attemptsCount ?? 0, priorPassedCount: passedCount, prerequisites: prompt.prerequisites });
    evaluation = { ...evaluation, updatedMasteryState: policy.state, masteryReason: policy.reason, isPrerequisiteBlocked: policy.isPrerequisiteBlocked, blockingPrerequisiteNames: policy.blockingPrerequisiteNames };
    // a. Record attempt
    const attempt = await tx.practiceAttempt.create({
      data: {
        userId,
        conceptId,
        workspaceId: concept.workspaceId,
        type: "assessment",
        prompt: prompt.scenario + "\n" + prompt.challenge,
        response,
        passed: evaluation.passed,
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        missing: evaluation.missing,
      },
    });

    // b. Fetch existing mastery record
    const existingMastery = await tx.conceptMastery.findUnique({
      where: {
        userId_conceptId: { userId, conceptId },
      },
    });

    const now = new Date();
    const newBestScore = Math.max(existingMastery?.bestScore || 0, evaluation.score);
    const newAttemptsCount = (existingMastery?.attemptsCount || 0) + 1;

    let demonstratedAt = existingMastery?.demonstratedAt;
    if (evaluation.passed && !demonstratedAt) {
      demonstratedAt = now;
    }

    let masteredAt = existingMastery?.masteredAt;
    if (evaluation.updatedMasteryState === "mastered" && !masteredAt) {
      masteredAt = now;
    }

    await tx.conceptMastery.upsert({
      where: {
        userId_conceptId: { userId, conceptId },
      },
      create: {
        userId,
        conceptId,
        workspaceId: concept.workspaceId,
        state: evaluation.updatedMasteryState,
        bestScore: newBestScore,
        attemptsCount: newAttemptsCount,
        demonstratedAt,
        masteredAt,
      },
      update: {
        state: evaluation.updatedMasteryState,
        bestScore: newBestScore,
        attemptsCount: newAttemptsCount,
        demonstratedAt,
        masteredAt,
      },
    });

    return attempt;
  }, { timeout: 20_000, maxWait: 15_000 });

  logger.info("assessment.attempt_submitted", {
    userId,
    conceptId,
    attemptId: result.id,
    score: evaluation.score,
    passed: evaluation.passed,
    updatedState: evaluation.updatedMasteryState,
  });

  return {
    ok: true,
    evaluation,
    attemptId: result.id,
  };
}

/**
 * Retrieves the full mastery dossier and attempt history for an authorized concept.
 */
export async function getAuthorizedConceptMastery(
  userId: string,
  conceptId: string
): Promise<ConceptMasteryReport | null> {
  const concept = await prisma.concept.findFirst({
    where: {
      id: conceptId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      evidence: true,
      toRelationships: {
        where: {
          type: { in: ["prerequisite", "depends_on"] },
          confidence: { gte: 0.5 },
        },
        include: {
          sourceConcept: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      practiceAttempts: {
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!concept) return null;

  // Prerequisite masteries
  const prereqIds = concept.toRelationships.map((r) => r.sourceConcept.id);
  const prereqMasteries = await prisma.conceptMastery.findMany({
    where: {
      userId,
      conceptId: { in: prereqIds },
    },
  });
  const prereqMap = new Map(prereqMasteries.map((m) => [m.conceptId, m.state]));

  const blockingPrerequisites: PrerequisiteMasteryRef[] = concept.toRelationships.map((r) => {
    const state = prereqMap.get(r.sourceConcept.id) ?? "not_started";
    return {
      id: r.sourceConcept.id,
      name: r.sourceConcept.name,
      slug: r.sourceConcept.slug,
      state,
      isSatisfied: state === "demonstrated" || state === "mastered",
    };
  });

  const masteryRecord = await prisma.conceptMastery.findUnique({
    where: {
      userId_conceptId: { userId, conceptId },
    },
  });

  const primaryEvidence = concept.evidence[0] || null;
  const unsatisfiedPrereqs = blockingPrerequisites.filter((p) => !p.isSatisfied);

  return {
    conceptId: concept.id,
    conceptName: concept.name,
    conceptSlug: concept.slug,
    importance: concept.importance,
    state: masteryRecord?.state ?? "not_started",
    bestScore: masteryRecord?.bestScore ?? 0,
    attemptsCount: masteryRecord?.attemptsCount ?? 0,
    demonstratedAt: masteryRecord?.demonstratedAt ?? null,
    masteredAt: masteryRecord?.masteredAt ?? null,
    canAssess: unsatisfiedPrereqs.length === 0,
    blockingPrerequisites,
    evidenceExcerpt: primaryEvidence?.excerpt ?? null,
    evidenceFilePath: primaryEvidence?.filePath ?? null,
    history: concept.practiceAttempts.map((a) => ({
      id: a.id,
      type: a.type,
      passed: a.passed,
      score: a.score,
      feedback: a.feedback,
      strengths: a.strengths,
      missing: a.missing,
      createdAt: a.createdAt,
    })),
  };
}
