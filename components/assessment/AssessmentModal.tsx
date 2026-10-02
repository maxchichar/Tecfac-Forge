"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  AssessmentPrompt,
  AssessmentEvaluationResult,
  ConceptMasteryReport,
} from "@/lib/server/assessment/types";
import { MasteryState } from "@prisma/client";
import {
  ShieldAlert,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lock,
} from "lucide-react";

interface AssessmentModalProps {
  conceptId: string | null;
  conceptName?: string;
  isOpen: boolean;
  onClose: () => void;
  onAttemptCompleted?: (conceptId: string, state: MasteryState) => void;
}

export function AssessmentModal({
  conceptId,
  conceptName,
  isOpen,
  onClose,
  onAttemptCompleted,
}: AssessmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState<AssessmentPrompt | null>(null);
  const [masteryReport, setMasteryReport] = useState<ConceptMasteryReport | null>(null);
  const [response, setResponse] = useState("");
  const [evaluation, setEvaluation] = useState<AssessmentEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !conceptId) {
      setPrompt(null);
      setMasteryReport(null);
      setResponse("");
      setEvaluation(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/concepts/${conceptId}/assessment`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load assessment.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPrompt(data.assessment);
          setMasteryReport(data.mastery);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, conceptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptId || !response.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/concepts/${conceptId}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Evaluation failed");
      }

      setEvaluation(data.evaluation);
      if (onAttemptCompleted) {
        onAttemptCompleted(conceptId, data.evaluation.updatedMasteryState);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setEvaluation(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
              <Award className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Concept Assessment & Mastery
              </span>
            </div>
            {masteryReport && (
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                  masteryReport.state === "mastered"
                    ? "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]"
                    : masteryReport.state === "demonstrated"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : masteryReport.state === "learning"
                    ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                    : "bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] border-[var(--color-border)]"
                }`}
              >
                Status: {masteryReport.state.replace("_", " ").toUpperCase()}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-semibold">
            {prompt?.conceptName || conceptName || "Concept Assessment"}
          </DialogTitle>
          {prompt?.learningObjective && (
            <DialogDescription className="text-sm text-[var(--color-text-secondary)]">
              {prompt.learningObjective}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
            Loading evaluative assessment challenge...
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-md)] border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
            {error}
          </div>
        )}

        {!loading && prompt && !prompt.canAssess && !evaluation && (
          <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Lock className="h-4 w-4" /> Assessment Blocked: Unmet Prerequisites
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Before taking the formal evaluative assessment for &ldquo;{prompt.conceptName}&rdquo;, you must engage with and demonstrate its foundational prerequisites:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-300">
              {prompt.blockingPrerequisiteNames.map((name, idx) => (
                <li key={idx}>Prerequisite: {name}</li>
              ))}
            </ul>
            <div className="pt-2 flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Return to Learning Path
              </Button>
            </div>
          </div>
        )}

        {!loading && prompt && prompt.canAssess && !evaluation && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Scenario & Challenge */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                <ShieldAlert className="h-4 w-4 text-[var(--color-text-secondary)]" />
                Evaluative Challenge
              </div>
              <p className="text-sm text-[var(--color-text-primary)]">{prompt.scenario}</p>
              <p className="text-xs text-[var(--color-accent-solid)] font-semibold pt-1">
                {prompt.challenge}
              </p>
            </div>

            {/* Rubric Requirements */}
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-3">
              <h5 className="text-xs font-medium text-[var(--color-text-tertiary)] flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" /> Assessment Rubric Requirements:
              </h5>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--color-text-secondary)]">
                {prompt.rubricGuidelines.map((guideline, i) => (
                  <li key={i}>{guideline}</li>
                ))}
              </ul>
            </div>

            {/* Source Truth Evidence */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-hover)] p-3 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-text-tertiary)]">
                <FileText className="h-3 w-3" />
                {prompt.sourceEvidence.filePath}
                {prompt.sourceEvidence.section && ` § ${prompt.sourceEvidence.section}`}
              </div>
              <p className="italic text-[var(--color-text-secondary)] line-clamp-3">
                &ldquo;{prompt.sourceEvidence.excerpt}&rdquo;
              </p>
            </div>

            {/* Response Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Your Technical Explanation & Analysis:
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={6}
                required
                placeholder="Explain the operational invariants, failure modes prevented, and concrete mechanisms..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm focus:border-[var(--color-text-primary)] focus:outline-none"
              />
              <div className="text-right text-[11px] text-[var(--color-text-tertiary)]">
                {response.length} characters (min 25)
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || response.trim().length < 25}
                className="gap-1.5 bg-[var(--color-accent-solid)] text-[var(--color-bg)] hover:brightness-110"
              >
                {submitting ? "Evaluating against source rubric..." : "Submit for Evaluation"}
              </Button>
            </div>
          </form>
        )}

        {/* Evaluation Result View */}
        {evaluation && (
          <div className="space-y-5 py-2">
            {/* Banner */}
            <div
              className={`rounded-[var(--radius-md)] border p-4 ${
                evaluation.passed
                  ? evaluation.updatedMasteryState === "mastered"
                    ? "border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]"
                    : "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {evaluation.passed ? (
                    evaluation.updatedMasteryState === "mastered" ? (
                      <Award className="h-6 w-6 text-[var(--color-text-secondary)]" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    )
                  ) : (
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                  )}
                  <div>
                    <h4 className="text-base font-semibold">
                      {evaluation.passed
                        ? evaluation.updatedMasteryState === "mastered"
                          ? "Concept Mastered!"
                          : "Understanding Demonstrated!"
                        : "Revision Recommended"}
                    </h4>
                    <p className="text-xs text-[var(--color-text-tertiary)]">
                      New State: {evaluation.updatedMasteryState.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">{evaluation.score}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">/100</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {evaluation.feedback}
              </p>
              <p className="mt-2 text-xs font-medium text-[var(--color-text-tertiary)]">
                {evaluation.masteryReason}
              </p>
            </div>

            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified Strengths
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.strengths.map((str, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing */}
            {evaluation.missing.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Areas to Address
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.missing.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source Truth Reference */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1 text-xs">
              <span className="font-semibold text-[var(--color-text-tertiary)]">
                Source Reference:
              </span>
              <p className="text-[var(--color-text-secondary)] italic">
                &ldquo;{evaluation.sourceEvidenceExcerpt}&rdquo;
              </p>
            </div>

            {/* Suggested Next Step */}
            <p className="text-xs font-medium text-[var(--color-text-secondary)]">
              {evaluation.suggestedNextStep}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              {!evaluation.passed ? (
                <Button variant="secondary" onClick={handleRetry} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Refine Response
                </Button>
              ) : (
                <Button onClick={onClose} className="gap-1.5 bg-[var(--color-accent-solid)] text-[var(--color-bg)] hover:brightness-110">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
