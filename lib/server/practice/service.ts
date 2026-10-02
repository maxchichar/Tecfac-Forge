import { prisma } from "@/lib/prisma";
import { generatePracticePrompt, evaluatePracticeSubmission } from "./evaluator";
import { PracticePrompt, PracticeEvaluationResult, PracticeAttemptRecord } from "./types";
import { deriveLearningObjective } from "@/lib/server/curriculum/objectives";
import { logger } from "@/lib/logger";

/**
 * Retrieves the practice task prompt for an authorized concept.
 */
export async function getAuthorizedConceptPractice(
  userId: string,
  conceptId: string
): Promise<PracticePrompt | null> {
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
    },
  });

  if (!concept) return null;

  const primaryEvidence = concept.evidence[0] || {
    filePath: "unknown.md",
    section: null,
    excerpt: concept.description,
  };

  const learningObjective = deriveLearningObjective(concept.name, concept.description, primaryEvidence.excerpt);

  return generatePracticePrompt(
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
    }
  );
}

/**
 * Submits, evaluates, and persists a practice attempt for an authorized concept.
 */
export async function submitAuthorizedPracticeAttempt(
  userId: string,
  conceptId: string,
  response: string,
  fetchFn?: typeof fetch
): Promise<{ ok: true; evaluation: PracticeEvaluationResult; attemptId: string } | { ok: false; status: number; error: string }> {
  // 1. Authorize: verify user is in workspace of this concept
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
    },
  });

  if (!concept) {
    return { ok: false, status: 404, error: "Concept not found or unauthorized." };
  }

  const primaryEvidence = concept.evidence[0] || {
    filePath: "unknown.md",
    section: null,
    excerpt: concept.description,
  };

  const learningObjective = deriveLearningObjective(concept.name, concept.description, primaryEvidence.excerpt);

  const prompt = generatePracticePrompt(
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
    }
  );

  // 2. Evaluate submission
  const evaluation = await evaluatePracticeSubmission(prompt, response, fetchFn);

  // 3. Persist attempt atomically in PostgreSQL
  const attempt = await prisma.practiceAttempt.create({
    data: {
      userId,
      conceptId: concept.id,
      workspaceId: concept.workspaceId,
      prompt: prompt.scenario + "\n" + prompt.instructions,
      response,
      passed: evaluation.passed,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      missing: evaluation.missing,
    },
  });

  logger.info("practice.attempt_submitted", {
    userId,
    conceptId: concept.id,
    attemptId: attempt.id,
    score: evaluation.score,
    passed: evaluation.passed,
  });

  return {
    ok: true,
    evaluation,
    attemptId: attempt.id,
  };
}

/**
 * Retrieves the history of practice attempts for a user and concept.
 */
export async function getAuthorizedPracticeHistory(
  userId: string,
  conceptId: string
): Promise<PracticeAttemptRecord[] | null> {
  const concept = await prisma.concept.findFirst({
    where: {
      id: conceptId,
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
  });

  if (!concept) return null;

  const records = await prisma.practiceAttempt.findMany({
    where: {
      userId,
      conceptId,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return records.map((r) => ({
    id: r.id,
    userId: r.userId,
    conceptId: r.conceptId,
    workspaceId: r.workspaceId,
    prompt: r.prompt,
    response: r.response,
    passed: r.passed,
    score: r.score,
    feedback: r.feedback,
    strengths: r.strengths,
    missing: r.missing,
    createdAt: r.createdAt,
  }));
}
