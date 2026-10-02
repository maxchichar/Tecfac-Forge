export type PracticeTaskType =
  | "architectural_reasoning"
  | "diagnostic_analysis"
  | "procedural_explanation";

export interface SourceEvidenceCitation {
  filePath: string;
  section?: string | null;
  excerpt: string;
}

export interface PracticePrompt {
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  learningObjective: string;
  taskType: PracticeTaskType;
  scenario: string;
  instructions: string;
  sourceEvidence: SourceEvidenceCitation;
  rubricGuidelines: string[];
}

export interface PracticeEvaluationResult {
  passed: boolean;
  score: number;
  strengths: string[];
  missing: string[];
  feedback: string;
  sourceEvidenceExcerpt: string;
  suggestedNextStep: string;
}

export interface PracticeAttemptRecord {
  id: string;
  userId: string;
  conceptId: string;
  workspaceId: string;
  prompt: string;
  response: string;
  passed: boolean;
  score: number;
  feedback: string;
  strengths: string[];
  missing: string[];
  createdAt: Date;
}
