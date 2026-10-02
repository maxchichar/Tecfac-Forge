"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Brain, FileText, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CourseIntelligenceReport } from "@/lib/server/intelligence/types";

interface CourseIntelligenceViewProps {
  courseId: string;
  initialReport: CourseIntelligenceReport | null;
}

export function CourseIntelligenceView({ courseId, initialReport }: CourseIntelligenceViewProps) {
  const [report, setReport] = useState<CourseIntelligenceReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    initialReport?.concepts[0]?.id ?? null
  );

  async function handleAnalyze(force = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });

      const data = await res.json();
      if (!res.ok || !data.report) {
        throw new Error(data.message || "Failed to extract course intelligence.");
      }

      setReport(data.report);
      if (data.report.concepts.length > 0 && !selectedConceptId) {
        setSelectedConceptId(data.report.concepts[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const selectedConcept = report?.concepts.find((c) => c.id === selectedConceptId);
  const foundationalCount = report?.concepts.filter((c) => c.importance === "foundational").length ?? 0;
  const coreCount = report?.concepts.filter((c) => c.importance === "core").length ?? 0;
  const advancedCount = report?.concepts.filter((c) => c.importance === "advanced").length ?? 0;
  void advancedCount; // surfaced in the metrics grid — add its Card below when needed

  if (!report || !report.analysisRun || report.analysisRun.status !== "completed") {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
          <Brain className="h-6 w-6 text-[var(--color-accent-solid)]" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Source Intelligence Not Extracted Yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-tertiary)]">
          Analyze this repository to extract foundational concepts, cross-cutting architectural relationships, and grounded source evidence.
        </p>

        {error && (
          <div className="mx-auto mt-4 max-w-md rounded-md bg-red-500/10 p-3 text-sm text-red-500 flex items-center gap-2 text-left">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6">
          <Button variant="primary" size="md" onClick={() => handleAnalyze(false)} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Repository...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Source Intelligence
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Overview Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--color-accent-solid)]" />
            Repository Knowledge Structure
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-tertiary)]">
            Verified concepts, grounded evidence, and prerequisite relationships extracted from source material.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAnalyze(true)}
            disabled={loading}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-analyze
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-500 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">Total Concepts</p>
          <p className="mt-1 text-2xl font-bold">{report.concepts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">Foundational</p>
          <p className="mt-1 text-2xl font-bold text-blue-400">{foundationalCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">Core Concepts</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{coreCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-tertiary)] font-medium">Prerequisite Links</p>
          <p className="mt-1 text-2xl font-bold text-purple-400">{report.relationships.length}</p>
        </Card>
      </div>

      {/* Main Intelligence Workspace: Concepts List & Selected Evidence Drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Concept List */}
        <div className="lg:col-span-6 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Extracted Concepts
          </p>
          <div className="space-y-2">
            {report.concepts.map((concept) => {
              const isSelected = concept.id === selectedConceptId;

              return (
                <div
                  key={concept.id}
                  onClick={() => setSelectedConceptId(concept.id)}
                  className={`cursor-pointer rounded-[var(--radius-md)] border p-4 transition-all ${
                    isSelected
                      ? "border-[var(--color-accent-solid)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm text-[var(--color-text-primary)]">{concept.name}</h4>
                    <span className="text-[11px] font-medium capitalize px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                      {concept.importance}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {concept.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      Grounded ({Math.round(concept.confidence * 100)}% conf.)
                    </span>
                    <span>{concept.evidence.length} source reference(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Concept Deep-Dive, Evidence & Relationships */}
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Grounding Evidence & Relationships
          </p>

          {selectedConcept ? (
            <div className="space-y-4">
              {/* Selected Concept Overview Card */}
              <Card className="p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">{selectedConcept.name}</h3>
                    <span className="text-xs text-[var(--color-text-tertiary)]">
                      Confidence: {Math.round(selectedConcept.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">{selectedConcept.description}</p>
                </div>

                {/* Prerequisites / Dependencies */}
                {(selectedConcept.prerequisites.length > 0 || selectedConcept.dependents.length > 0) && (
                  <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">Prerequisites & Relations</p>
                    <div className="space-y-1.5 text-xs">
                      {selectedConcept.prerequisites.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                          <span className="font-semibold text-blue-400">{p.targetConceptName}</span>
                          <ArrowRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                          <span className="italic text-[var(--color-text-tertiary)]">is prerequisite for this</span>
                        </div>
                      ))}
                      {selectedConcept.dependents.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                          <span className="font-semibold">{selectedConcept.name}</span>
                          <ArrowRight className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                          <span className="italic text-[var(--color-text-tertiary)]">is required for</span>
                          <span className="font-semibold text-purple-400">{d.sourceConceptName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Source Evidence Cards */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                  Source Grounding ({selectedConcept.evidence.length})
                </p>

                {selectedConcept.evidence.map((ev, idx) => (
                  <Card key={idx} className="p-4 space-y-2.5 bg-[var(--color-surface)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-mono text-[var(--color-accent-solid)]">
                        <FileText className="h-3.5 w-3.5" />
                        {ev.filePath}
                      </span>
                      {ev.lessonSlug && (
                        <Link
                          href={`/lesson/${ev.lessonSlug}`}
                          className="flex items-center gap-1 text-[var(--color-accent-solid)] hover:underline"
                        >
                          Study Lesson
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>

                    {ev.section && (
                      <p className="text-xs font-medium text-[var(--color-text-primary)]">
                        Section: {ev.section}
                      </p>
                    )}

                    <blockquote className="rounded border-l-2 border-[var(--color-accent-solid)] bg-[var(--color-surface-hover)] p-2.5 text-xs italic text-[var(--color-text-secondary)] leading-relaxed">
                      &quot;{ev.excerpt}&quot;
                    </blockquote>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">
              Select a concept on the left to inspect its source evidence and relationships.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
