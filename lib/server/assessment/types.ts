import { ConceptImportance, MasteryState, AttemptType } from "@prisma/client";
import { SourceEvidenceCitation } from "@/lib/server/practice/types";

export type AssessmentTaskType =
  | "diagnostic_analysis"
  | "architectural_invariant"
  | "behavioral_prediction";

export interface PrerequisiteMasteryRef {
  id: string;
  name: string;
  slug: string;
  state: MasteryState;
  isSatisfied: boolean; // demonstrated or mastered
}

export interface AssessmentPrompt {
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  learningObjective: string;
  taskType: AssessmentTaskType;
  scenario: string;
  challenge: string;
  sourceEvidence: SourceEvidenceCitation;
  rubricGuidelines: string[];
  prerequisites: PrerequisiteMasteryRef[];
  canAssess: boolean;
  blockingPrerequisiteNames: string[];
  currentMasteryState: MasteryState;
}

export interface AssessmentEvaluationResult {
  passed: boolean;
  score: number;
  strengths: string[];
  missing: string[];
  feedback: string;
  sourceEvidenceExcerpt: string;
  suggestedNextStep: string;
  updatedMasteryState: MasteryState;
  masteryReason: string;
  isPrerequisiteBlocked: boolean;
  blockingPrerequisiteNames: string[];
}

export interface ConceptMasteryReport {
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  importance: ConceptImportance;
  state: MasteryState;
  bestScore: number;
  attemptsCount: number;
  demonstratedAt: Date | null;
  masteredAt: Date | null;
  canAssess: boolean;
  blockingPrerequisites: PrerequisiteMasteryRef[];
  evidenceExcerpt: string | null;
  evidenceFilePath: string | null;
  history: {
    id: string;
    type: AttemptType;
    passed: boolean;
    score: number;
    feedback: string;
    strengths: string[];
    missing: string[];
    createdAt: Date;
  }[];
}
