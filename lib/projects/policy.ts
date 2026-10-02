import { z } from "zod";
import type { MilestoneStatus } from "./types";

export const CreateProjectSchema = z.object({
  courseId: z.string().min(1).max(200),
  title: z.string().trim().min(5).max(120),
  outcome: z.string().trim().min(20).max(2000),
  sourceIds: z.array(z.string().min(1).max(200)).min(1).max(6)
    .refine((ids) => new Set(ids).size === ids.length, "Select each source once."),
}).strict();

export const SubmitProjectSchema = z.object({
  milestoneId: z.string().min(1).max(200),
  artifact: z.string().trim().max(16000),
  explanation: z.string().trim().max(6000),
  verification: z.string().trim().max(6000),
  criterionEvidence: z.array(z.string().trim().max(2000)).max(8),
  selfChecked: z.boolean(),
}).strict();
export type ProjectSubmissionInput = z.infer<typeof SubmitProjectSchema>;

export const ReviewProjectSchema = z.object({
  submissionId: z.string().min(1).max(200),
  status: z.enum(["accepted", "needs_revision"]),
  feedback: z.string().trim().min(20).max(4000),
}).strict();

export function canAdvance(status?: string): boolean {
  return status === "self_checked" || status === "accepted";
}

export function milestoneStatus(latest: MilestoneStatus | undefined, predecessors: (string | undefined)[]): MilestoneStatus {
  // Preserve evidence/history even when an earlier milestone is reopened.
  if (latest) return latest;
  return predecessors.every(canAdvance) ? "available" : "locked";
}

/** Completeness only. Never interprets prose as technical correctness. */
export function checkSubmission(input: ProjectSubmissionInput, criteria: string[]) {
  const missing: string[] = [];
  if (!input.artifact) missing.push("Attach a patch, code sample, or a reference to your work.");
  if (!input.explanation) missing.push("Explain your decisions and cite the source you used.");
  if (!input.verification) missing.push("Record how you checked the work and what happened.");
  criteria.forEach((criterion, i) => {
    if (!input.criterionEvidence[i]?.trim()) missing.push(`Add evidence for: ${criterion}`);
  });
  if (input.criterionEvidence.length !== criteria.length) missing.push("Address exactly the listed acceptance criteria.");
  const status = missing.length ? "needs_revision" as const : input.selfChecked ? "self_checked" as const : "submitted" as const;
  return {
    status,
    feedback: missing.length
      ? `Evidence checklist needs revision:\n${missing.map((m) => `• ${m}`).join("\n")}\nThis checks completeness, not technical correctness.`
      : input.selfChecked
        ? "Evidence recorded and self-check acknowledged. You can continue to the next milestone. Technical correctness has not been independently verified; this does not award mastery."
        : "Evidence recorded. Ask a workspace owner or admin other than yourself to review it, or resubmit after checking the acceptance criteria yourself. Technical correctness has not yet been verified.",
  };
}

/** Authored workflow, not an AI claim about a repository's implementation. */
export function projectMilestoneTemplate(outcome: string) {
  return [
    {
      title: "Investigate the source", brief: `Your outcome: ${outcome}\nRead the selected material. Trace one relevant behavior, record the files involved, and separate documented facts from questions you still need to investigate.`,
      criteria: ["Trace one relevant behavior with actual file or section references.", "Record constraints and unanswered questions before choosing an implementation."],
    },
    {
      title: "Design a small change", brief: "Propose the smallest change that achieves your outcome. Define an observable success case and a failure case before implementation. Explain how the selected sources inform your plan.",
      criteria: ["Define the change, its boundaries, and the expected result.", "Specify one success check and one failure or boundary check."],
    },
    {
      title: "Build a working increment", brief: "Implement the planned change in your own development environment. Submit the relevant patch or code, explain your decisions, and connect them to the source. Forge does not execute this code.",
      criteria: ["Provide the implementation or patch and identify the files changed.", "Explain a design decision with a source reference and a tradeoff."],
    },
    {
      title: "Verify and debug", brief: "Run your checks locally. Record expected versus actual behavior for both success and failure cases. If you find a defect, fix it and include the regression check.",
      criteria: ["Record the command or procedure, expected result, and observed result.", "Demonstrate a failure or boundary case and explain its handling."],
    },
    {
      title: "Explain and hand off", brief: "Prepare a reproducible handoff: how to use your change, why it works, what remains uncertain, and how someone else can verify it. Reflect on what you can now do independently.",
      criteria: ["Provide reproduction instructions and the final artifact reference.", "Explain limitations and a reasonable next improvement."],
    },
  ];
}
