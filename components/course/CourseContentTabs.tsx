"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Brain, Milestone } from "lucide-react";
import { ModuleAccordion, ModuleWithLessons } from "@/components/course/ModuleAccordion";
import { CourseIntelligenceView } from "@/components/course/CourseIntelligenceView";
import { LearningPathView } from "@/components/course/LearningPathView";
import { Card } from "@/components/ui/Card";
import { DifficultyBadge } from "@/components/ui/Badge";
import { CourseIntelligenceReport } from "@/lib/server/intelligence/types";
import { CourseLearningPathReport } from "@/lib/server/curriculum/learning-path";
import { Difficulty } from "@/lib/mock-data";

export interface CourseTabProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours?: number;
}

interface CourseContentTabsProps {
  courseId: string;
  isDbCourse: boolean;
  modules: ModuleWithLessons[];
  projects: CourseTabProject[];
  initialIntelligence: CourseIntelligenceReport | null;
  initialLearningPath?: CourseLearningPathReport | null;
}

export function CourseContentTabs({
  courseId,
  isDbCourse,
  modules,
  projects,
  initialIntelligence,
  initialLearningPath = null,
}: CourseContentTabsProps) {
  const [activeTab, setActiveTab] = useState<"path" | "curriculum" | "intelligence">("path");

  const conceptCount = initialIntelligence?.concepts.length ?? 0;
  const pathConceptsCount = initialLearningPath?.totalConcepts ?? conceptCount;
  const pathCompletedCount = initialLearningPath?.completedConcepts ?? 0;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab("path")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "path"
              ? "border-[var(--color-accent-solid)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <Milestone className="h-4 w-4" />
          <span>Learning Path</span>
          {pathConceptsCount > 0 && (
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-solid)]">
              {pathCompletedCount}/{pathConceptsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("curriculum")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "curriculum"
              ? "border-[var(--color-accent-solid)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Curriculum</span>
          <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)]">
            {modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons
          </span>
        </button>

        <button
          onClick={() => setActiveTab("intelligence")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "intelligence"
              ? "border-[var(--color-accent-solid)] text-[var(--color-text-primary)]"
              : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          <Brain className="h-4 w-4" />
          <span>Source Intelligence</span>
          {conceptCount > 0 && (
            <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-tertiary)]">
              {conceptCount} concepts
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "path" ? (
        <div>
          {isDbCourse ? (
            <LearningPathView courseId={courseId} initialReport={initialLearningPath} />
          ) : (
            <Card className="p-8 text-center border-dashed">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
                <Milestone className="h-6 w-6 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Demo Course Learning Path</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
                Prerequisite learning paths and active practice evaluate on real repositories imported into your workspace.
              </p>
            </Card>
          )}
        </div>
      ) : activeTab === "curriculum" ? (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-medium">Modules</h2>
            <ModuleAccordion modules={modules} />
          </section>

          {projects.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium">Projects</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <Link key={p.id} href={`/project/${p.slug}`}>
                    <Card className="p-4 hover:bg-[var(--color-surface-hover)]">
                      <div className="flex items-center justify-between">
                        <p className="text-[13.5px] font-medium">{p.title}</p>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-[var(--color-text-tertiary)]">
                        {p.description}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div>
          {isDbCourse ? (
            <CourseIntelligenceView courseId={courseId} initialReport={initialIntelligence} />
          ) : (
            <Card className="p-8 text-center border-dashed">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
                <Brain className="h-6 w-6 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="mt-4 text-base font-semibold">Demo Course Intelligence Preview</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-text-tertiary)]">
                This is a seeded demo course. Full source AST analysis and evidence grounding run on courses imported from real GitHub repositories in your workspace.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
