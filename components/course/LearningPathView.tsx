"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CourseLearningPathReport,
  LearningPathNode,
} from "@/lib/server/curriculum/learning-path";
import { PracticeModal } from "@/components/practice/PracticeModal";
import { AssessmentModal } from "@/components/assessment/AssessmentModal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  BookOpen,
  Sparkles,
  Milestone,
  FileText,
  RotateCw,
  Award,
} from "lucide-react";

interface LearningPathViewProps {
  courseId: string;
  initialReport: CourseLearningPathReport | null;
}

export function LearningPathView({ courseId, initialReport }: LearningPathViewProps) {
  const [report, setReport] = useState<CourseLearningPathReport | null>(initialReport);
  const [selectedPracticeConceptId, setSelectedPracticeConceptId] = useState<string | null>(null);
  const [selectedPracticeConceptName, setSelectedPracticeConceptName] = useState<string | undefined>(undefined);
  const [selectedAssessmentConceptId, setSelectedAssessmentConceptId] = useState<string | null>(null);
  const [selectedAssessmentConceptName, setSelectedAssessmentConceptName] = useState<string | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshLearningPath = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/learning-path`);
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }
    } catch {
      // Keep existing
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenPractice = (node: LearningPathNode) => {
    setSelectedPracticeConceptId(node.conceptId);
    setSelectedPracticeConceptName(node.name);
  };

  const handleOpenAssessment = (node: LearningPathNode) => {
    setSelectedAssessmentConceptId(node.conceptId);
    setSelectedAssessmentConceptName(node.name);
  };

  const handlePracticeCompleted = (_conceptId: string, passed: boolean) => {
    if (passed) {
      refreshLearningPath();
    }
  };

  const handleAssessmentCompleted = () => {
    refreshLearningPath();
  };

  if (!report || report.nodes.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
          <Milestone className="h-6 w-6 text-[var(--color-text-tertiary)]" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No Learning Path Generated Yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
          Extract source intelligence for this course first to generate a prerequisite-aware learning sequence.
        </p>
      </Card>
    );
  }

  const completionPct = report.totalConcepts > 0
    ? Math.round((report.completedConcepts / report.totalConcepts) * 100)
    : 0;

  const nextRecommendedNode = report.nextRecommendedConceptId
    ? report.nodes.find((n) => n.conceptId === report.nextRecommendedConceptId)
    : null;

  return (
    <div className="space-y-6">
      {/* Progress & Overview Header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
                Prerequisite Learning Path
              </h3>
              <button
                onClick={refreshLearningPath}
                disabled={isRefreshing}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Refresh progress"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Deterministic sequence ordered by foundational requirements and concept dependencies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-[var(--color-text-tertiary)]">Completed:</span>{" "}
              <span className="font-semibold text-[var(--color-text-primary)]">{report.completedConcepts}</span>/
              {report.totalConcepts}
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Demonstrated:</span>{" "}
              <span className="font-semibold text-emerald-400">{report.demonstratedConcepts || 0}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Mastered:</span>{" "}
              <span className="font-semibold text-purple-400">{report.masteredConcepts || 0}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Available:</span>{" "}
              <span className="font-semibold text-[var(--color-accent-solid)]">{report.availableConcepts}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">Locked:</span>{" "}
              <span className="font-semibold text-[var(--color-text-secondary)]">{report.lockedConcepts}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-hover)]">
            <div
              className="h-full bg-[var(--color-accent-solid)] transition-all duration-500 ease-out"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-[var(--color-text-tertiary)]">
            <span>{completionPct}% curriculum complete</span>
            {report.hasCycle && (
              <span className="text-amber-400 font-medium">
                Mutual dependency handled deterministically
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Hero: Next Recommended Concept */}
      {nextRecommendedNode && (
        <Card className="border-[var(--color-accent-solid)]/40 bg-[var(--color-accent-soft)]/20 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent-solid)]">
            <Sparkles className="h-4 w-4" /> Next Recommended Focus
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                  Step {nextRecommendedNode.sequenceOrder}
                </span>
                <h4 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {nextRecommendedNode.name}
                </h4>
                <span className="rounded px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  {nextRecommendedNode.importance}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {nextRecommendedNode.learningObjective}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {nextRecommendedNode.associatedLesson && (
                <Link href={`/lesson/${nextRecommendedNode.associatedLesson.slug}`}>
                  <Button variant="secondary" size="sm" className="gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Study Lesson
                  </Button>
                </Link>
              )}
              <Button size="sm" onClick={() => handleOpenPractice(nextRecommendedNode)} className="gap-1.5">
                Practice Concept <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Sequenced Learning Path */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Complete Curricular Path ({report.totalConcepts} Concepts)
        </h4>

        <div className="space-y-3">
          {report.nodes.map((node) => {
            const isNext = node.conceptId === report.nextRecommendedConceptId;

            return (
              <div
                key={node.conceptId}
                className={`relative rounded-[var(--radius-md)] border p-4 transition-all ${
                  isNext
                    ? "border-[var(--color-accent-solid)] bg-[var(--color-surface)] shadow-md"
                    : node.isCompleted
                    ? "border-emerald-500/30 bg-[var(--color-surface)]/70"
                    : node.isLocked
                    ? "border-[var(--color-border-subtle)] bg-[var(--color-surface)]/40 opacity-75"
                    : "border-[var(--color-border)] bg-[var(--color-surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Step indicator + Content */}
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Status Circle */}
                    <div className="pt-0.5 shrink-0">
                      {node.isCompleted ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      ) : isNext ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-solid)] text-white text-xs font-bold ring-4 ring-[var(--color-accent-soft)]">
                          {node.sequenceOrder}
                        </div>
                      ) : node.isLocked ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] text-xs">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
                          {node.sequenceOrder}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5 className="font-semibold text-sm text-[var(--color-text-primary)]">
                          {node.name}
                        </h5>
                        <span className="rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]">
                          {node.importance}
                        </span>
                        {node.masteryState === "mastered" ? (
                          <span className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            <Award className="h-3 w-3 text-purple-400" /> Mastered
                          </span>
                        ) : node.masteryState === "demonstrated" ? (
                          <span className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Demonstrated
                          </span>
                        ) : node.masteryState === "learning" ? (
                          <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/30">
                            Learning
                          </span>
                        ) : (
                          <span className="rounded px-2 py-0.5 text-[10px] font-medium bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)]">
                            Not Started
                          </span>
                        )}
                        {node.practiceStats.attemptsCount > 0 && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              node.practiceStats.passed
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            Practice: {node.practiceStats.bestScore}/100
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                        {node.learningObjective}
                      </p>

                      {/* Prerequisites or Source file info */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                        {node.prerequisites.length > 0 ? (
                          <div className="flex items-center gap-1 text-[var(--color-text-tertiary)]">
                            <span>Requires:</span>
                            {node.prerequisites.map((p) => (
                              <span
                                key={p.id}
                                className={`rounded px-1.5 py-0.2 border ${
                                  p.isCompleted
                                    ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                                    : "border-amber-500/30 text-amber-400 bg-amber-500/5"
                                }`}
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-tertiary)]">
                            Foundational (no prior prerequisites)
                          </span>
                        )}

                        {node.evidenceFilePath && (
                          <span className="flex items-center gap-1 text-[var(--color-text-tertiary)] font-mono">
                            <FileText className="h-3 w-3" /> {node.evidenceFilePath}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {node.associatedLesson && (
                      <Link href={`/lesson/${node.associatedLesson.slug}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Lesson</span>
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={node.isLocked}
                      onClick={() => handleOpenPractice(node)}
                      className="h-8 text-xs gap-1"
                    >
                      Practice
                    </Button>
                    <Button
                      variant={node.masteryState === "mastered" ? "ghost" : "secondary"}
                      size="sm"
                      disabled={node.isLocked || !node.canAssess}
                      onClick={() => handleOpenAssessment(node)}
                      className={`h-8 text-xs gap-1 ${
                        node.masteryState === "mastered"
                          ? "border border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                          : "border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
                      }`}
                      title={!node.canAssess ? "Engage prerequisites before taking assessment" : undefined}
                    >
                      <Award className="h-3.5 w-3.5 text-indigo-400" />
                      {node.masteryState === "mastered" ? "Re-Assess" : "Assess"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practice Modal */}
      <PracticeModal
        conceptId={selectedPracticeConceptId}
        conceptName={selectedPracticeConceptName}
        isOpen={Boolean(selectedPracticeConceptId)}
        onClose={() => setSelectedPracticeConceptId(null)}
        onAttemptCompleted={handlePracticeCompleted}
      />

      {/* Assessment Modal */}
      <AssessmentModal
        conceptId={selectedAssessmentConceptId}
        conceptName={selectedAssessmentConceptName}
        isOpen={Boolean(selectedAssessmentConceptId)}
        onClose={() => setSelectedAssessmentConceptId(null)}
        onAttemptCompleted={handleAssessmentCompleted}
      />
    </div>
  );
}
