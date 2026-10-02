import { MasteryState } from "@prisma/client";
import { PrerequisiteMasteryRef } from "./types";

export interface MasteryEvaluationInput {
  currentState: MasteryState;
  assessmentPassed: boolean;
  assessmentScore: number;
  priorAttemptsCount: number;
  priorPassedCount: number;
  prerequisites: PrerequisiteMasteryRef[];
}

export interface MasteryEvaluationOutcome {
  state: MasteryState;
  reason: string;
  isPrerequisiteBlocked: boolean;
  blockingPrerequisiteNames: string[];
}

/**
 * Deterministic mastery policy evaluator.
 *
 * State Transitions:
 * - not_started: No lesson completed, no practice, no assessment.
 * - learning: Lesson completed or practice attempted, but assessment not yet passed.
 * - demonstrated: Assessment passed (score >= 70). Direct evidence of understanding.
 * - mastered: Assessment passed (score >= 70), ALL prerequisites are at least demonstrated
 *             or mastered, and high stability is shown (score >= 85 or multiple passing attempts).
 *
 * Invariant: demonstrated != mastered.
 * A concept cannot become 'mastered' if any prerequisite is un-demonstrated.
 */
export function evaluateMasteryPolicy(
  input: MasteryEvaluationInput
): MasteryEvaluationOutcome {
  const {
    currentState,
    assessmentPassed,
    assessmentScore,
    priorPassedCount,
    prerequisites,
  } = input;

  const blockingPrereqs = prerequisites.filter((p) => !p.isSatisfied);
  const isPrerequisiteBlocked = blockingPrereqs.length > 0;
  const blockingPrerequisiteNames = blockingPrereqs.map((p) => p.name);

  // 1. If assessment failed (< 70)
  if (!assessmentPassed) {
    return {
      state: currentState === "mastered" ? "demonstrated" : "learning",
      reason: `Assessment score ${assessmentScore}/100 did not meet the passing threshold (70). Re-examine the source evidence and refine your explanation.`,
      isPrerequisiteBlocked,
      blockingPrerequisiteNames,
    };
  }

  // 2. Assessment passed (score >= 70)
  // Check prerequisite readiness for full mastery
  if (isPrerequisiteBlocked) {
    return {
      state: "demonstrated",
      reason: `Assessment passed with score ${assessmentScore}/100 (demonstrated understanding). Full mastery is pending until prerequisite ${blockingPrerequisiteNames.map((n) => `"${n}"`).join(", ")} is demonstrated.`,
      isPrerequisiteBlocked: true,
      blockingPrerequisiteNames,
    };
  }

  // 3. All prerequisites are demonstrated/mastered. Check stability criteria for full mastery.
  const isHighPerformance = assessmentScore >= 85;
  const isConsistentPassing = priorPassedCount >= 1; // has passed previously and passed now

  if (isHighPerformance || isConsistentPassing) {
    return {
      state: "mastered",
      reason: `Concept mastered. Demonstrated stable technical reasoning (score: ${assessmentScore}/100) with all prerequisite competencies verified.`,
      isPrerequisiteBlocked: false,
      blockingPrerequisiteNames: [],
    };
  }

  // Passing score 70-84 on first try with satisfied prerequisites achieves 'demonstrated'.
  // Further practice or a second passing assessment elevates to 'mastered'.
  return {
    state: "demonstrated",
    reason: `Concept demonstrated (score: ${assessmentScore}/100). To elevate to full mastery, complete another evaluation or achieve score >= 85.`,
    isPrerequisiteBlocked: false,
    blockingPrerequisiteNames: [],
  };
}
