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
  PracticePrompt,
  PracticeEvaluationResult,
  PracticeAttemptRecord,
} from "@/lib/server/practice/types";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface PracticeModalProps {
  conceptId: string | null;
  conceptName?: string;
  isOpen: boolean;
  onClose: () => void;
  onAttemptCompleted?: (conceptId: string, passed: boolean) => void;
}

export function PracticeModal({
  conceptId,
  conceptName,
  isOpen,
  onClose,
  onAttemptCompleted,
}: PracticeModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prompt, setPrompt] = useState<PracticePrompt | null>(null);
  const [history, setHistory] = useState<PracticeAttemptRecord[]>([]);
  const [response, setResponse] = useState("");
  const [evaluation, setEvaluation] = useState<PracticeEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !conceptId) {
      setPrompt(null);
      setResponse("");
      setEvaluation(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/concepts/${conceptId}/practice`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load practice task.");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setPrompt(data.practice);
          setHistory(data.history || []);
          if (data.history && data.history.length > 0) {
            const latest = data.history[0];
            setResponse(latest.response);
            if (latest.passed) {
              setEvaluation({
                passed: latest.passed,
                score: latest.score,
                feedback: latest.feedback,
                strengths: latest.strengths,
                missing: latest.missing,
                sourceEvidenceExcerpt: data.practice.sourceEvidence.excerpt,
                suggestedNextStep: "Concept mastery verified from previous attempt.",
              });
            }
          }
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
      const res = await fetch(`/api/concepts/${conceptId}/practice`, {
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
        onAttemptCompleted(conceptId, data.evaluation.passed);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit response");
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
            <div className="flex items-center gap-2 text-[var(--color-accent-solid)]">
              <Brain className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Source Practice</span>
            </div>
            {history.length > 0 && (
              <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-hover)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)]">
                {history.length} {history.length === 1 ? "attempt" : "attempts"} logged
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-semibold">
            {prompt?.conceptName || conceptName || "Concept Practice"}
          </DialogTitle>
          {prompt?.learningObjective && (
            <DialogDescription className="text-sm text-[var(--color-text-secondary)]">
              {prompt.learningObjective}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
            Loading source practice task...
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-md)] border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
            {error}
          </div>
        )}

        {!loading && prompt && !evaluation && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Scenario & Task */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Engineering Scenario
              </h4>
              <p className="text-sm text-[var(--color-text-primary)]">{prompt.scenario}</p>
              <p className="text-xs text-[var(--color-text-secondary)] font-medium pt-1">
                {prompt.instructions}
              </p>
            </div>

            {/* Rubric Guidelines */}
            <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-3">
              <h5 className="text-xs font-medium text-[var(--color-text-tertiary)] flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-solid)]" /> Key Elements to Address:
              </h5>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--color-text-secondary)]">
                {prompt.rubricGuidelines.map((guideline, i) => (
                  <li key={i}>{guideline}</li>
                ))}
              </ul>
            </div>

            {/* Source Reference Excerpt */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-hover)] p-3 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-text-tertiary)]">
                <FileText className="h-3 w-3" />
                {prompt.sourceEvidence.filePath}
                {prompt.sourceEvidence.section && ` § ${prompt.sourceEvidence.section}`}
              </div>
              <p className="italic text-[var(--color-text-secondary)] line-clamp-3">
                &ldquo;{prompt.sourceEvidence.excerpt}&rdquo;
              </p>
            </div>

            {/* Response Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Your Reasoning / Explanation:
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={5}
                required
                placeholder="Explain the mechanism, rules, or requirements in your own words..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm focus:border-[var(--color-accent-solid)] focus:outline-none"
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
              <Button type="submit" disabled={submitting || response.trim().length < 20}>
                {submitting ? "Evaluating against source..." : "Submit Practice"}
              </Button>
            </div>
          </form>
        )}

        {/* Evaluation Result View */}
        {evaluation && (
          <div className="space-y-5 py-2">
            {/* Score & Verdict Banner */}
            <div
              className={`rounded-[var(--radius-md)] border p-4 ${
                evaluation.passed
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {evaluation.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                  )}
                  <h4 className="text-base font-semibold">
                    {evaluation.passed ? "Practice Passed!" : "Revision Recommended"}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold">{evaluation.score}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">/100</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {evaluation.feedback}
              </p>
            </div>

            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Demonstrated Strengths
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

            {/* Missing / Improvement Areas */}
            {evaluation.missing.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> Areas to Refine
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

            {/* Source Reference Excerpt */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1 text-xs">
              <span className="font-semibold text-[var(--color-text-tertiary)]">
                Source Truth Reference:
              </span>
              <p className="text-[var(--color-text-secondary)] italic">
                &ldquo;{evaluation.sourceEvidenceExcerpt}&rdquo;
              </p>
            </div>

            {/* Next Steps */}
            <p className="text-xs font-medium text-[var(--color-accent-solid)]">
              {evaluation.suggestedNextStep}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--color-border)]">
              {!evaluation.passed ? (
                <Button variant="secondary" onClick={handleRetry} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Refine Response
                </Button>
              ) : (
                <Button onClick={onClose} className="gap-1.5">
                  Done <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
