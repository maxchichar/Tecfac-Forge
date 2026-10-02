import * as fs from "node:fs";
import * as path from "node:path";

// Load .env.local for live database connection before loading prisma client
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserWorkspace } from "@/lib/server/workspace";
import { ingestGitHubRepoToDatabase } from "@/lib/server/importers/github";
import { getAuthorizedCourseBySlug, getAuthorizedCourses } from "@/lib/server/courses";
import { getAuthorizedLessonBySlug, getAuthorizedLessonById } from "@/lib/server/lessons";
import { setLessonProgress, getUserDashboardStats } from "@/lib/server/progress";
import { renderMarkdown } from "@/lib/markdown";
import { analyzeCourseIntelligence } from "@/lib/server/intelligence/pipeline";
import { getAuthorizedCourseIntelligence } from "@/lib/server/intelligence/queries";
import { getAuthorizedLearningPath } from "@/lib/server/curriculum/learning-path";
import {
  getAuthorizedConceptPractice,
  submitAuthorizedPracticeAttempt,
  getAuthorizedPracticeHistory,
} from "@/lib/server/practice/service";
import {
  getAuthorizedConceptAssessment,
  submitAuthorizedAssessmentAttempt,
  getAuthorizedConceptMastery,
} from "@/lib/server/assessment/service";

const isLiveConfigured = Boolean(
  process.env.DATABASE_URL?.startsWith("postgresql") && process.env.RUN_LIVE_E2E === "true"
);

describe.runIf(isLiveConfigured)("Complete Real Product Loop (Live DB & Live GitHub)", () => {
  const testUserId = "test-live-user-forge-01";
  let workspaceId: string;
  let bookCourseId: string;
  let targetConceptId: string;
  let targetConceptName: string;
  let targetEvidenceExcerpt: string;

  it("Step 1: resolves or creates an authorized user workspace in PostgreSQL", async () => {
    // Ensure test user exists in DB
    await prisma.user.upsert({
      where: { id: testUserId },
      update: { email: "test-live@forge.dev", name: "Test Live Engineer" },
      create: { id: testUserId, email: "test-live@forge.dev", name: "Test Live Engineer" },
    });

    const ws = await getOrCreateUserWorkspace(testUserId, "Test Live Engineer");
    expect(ws).toBeDefined();
    expect(ws.id).toBeTruthy();
    workspaceId = ws.id;
  });

  it("Step 2: Ingests Repository 1 (MunGell/awesome-for-beginners) and persists to DB", async () => {
    const importRes = await ingestGitHubRepoToDatabase(workspaceId, "https://github.com/MunGell/awesome-for-beginners");
    expect(importRes.ok).toBe(true);
    if (!importRes.ok) return;

    expect(importRes.courseSlug).toBeTruthy();

    // Verify course exists in PostgreSQL
    const course = await getAuthorizedCourseBySlug(testUserId, importRes.courseSlug);
    expect(course).not.toBeNull();
    expect(course?.title).toContain("Awesome For Beginners");
    expect(course?.modules.length).toBeGreaterThan(0);
    expect(course?.modules[0].lessons.length).toBeGreaterThan(0);

    // Verify lesson content can be retrieved and rendered
    const firstLesson = course!.modules[0].lessons[0];
    const detailedLesson = await getAuthorizedLessonBySlug(testUserId, firstLesson.slug);
    expect(detailedLesson).not.toBeNull();
    expect(detailedLesson?.markdown.length).toBeGreaterThan(0);

    // Step 3: Render lesson Markdown
    const html = await renderMarkdown(detailedLesson!.markdown);
    expect(html).toContain("<");

    // Step 4: Mark lesson complete
    const progressRes = await setLessonProgress(testUserId, firstLesson.id, true);
    expect(progressRes.ok).toBe(true);

    // Step 5: Dashboard reflects real progress
    const stats = await getUserDashboardStats(testUserId);
    expect(stats.completedLessonsCount).toBeGreaterThanOrEqual(1);

    const coursesWithProgress = await getAuthorizedCourses(testUserId);
    const thisCourse = coursesWithProgress.find((c) => c.slug === importRes.courseSlug);
    expect(thisCourse).toBeDefined();
    expect(thisCourse!.completedLessons).toBeGreaterThanOrEqual(1);
    expect(thisCourse!.completion).toBeGreaterThan(0);

    // Step 6: AI Tutor is grounded in the real lesson
    const tutorContext = await getAuthorizedLessonById(testUserId, firstLesson.id);
    expect(tutorContext).not.toBeNull();
    expect(tutorContext?.markdown).toBe(detailedLesson!.markdown);
    expect(tutorContext?.courseTitle).toBe(course!.title);
  });

  it("Step 3: Ingests Repository 2 (rust-lang/book) with multi-directory markdown docs", async () => {
    const importRes = await ingestGitHubRepoToDatabase(workspaceId, "rust-lang/book");
    expect(importRes.ok).toBe(true);
    if (!importRes.ok) return;

    const course = await getAuthorizedCourseBySlug(testUserId, importRes.courseSlug);
    expect(course).not.toBeNull();
    expect(course?.modules.length).toBeGreaterThan(1); // Multiple modules from subdirectories
    bookCourseId = course!.id;

    // Verify adjacent lesson navigation across course
    const sampleLesson = course!.modules[0].lessons[0];
    const detailed = await getAuthorizedLessonBySlug(testUserId, sampleLesson.slug);
    expect(detailed).not.toBeNull();
    expect(detailed?.next).toBeDefined();
  });

  it("Step 4: Extracts grounded source intelligence for rust-lang/book into PostgreSQL", async () => {
    expect(bookCourseId).toBeTruthy();

    const analysisRes = await analyzeCourseIntelligence(testUserId, bookCourseId, { force: true });
    expect(analysisRes.ok).toBe(true);
    if (!analysisRes.ok) return;

    expect(analysisRes.report.concepts.length).toBeGreaterThan(0);
    expect(analysisRes.report.analysisRun).not.toBeNull();
    expect(analysisRes.report.analysisRun?.status).toBe("completed");
    expect(analysisRes.report.analysisRun?.conceptsCount).toBeGreaterThan(0);
  });

  it("Step 5: Verifies database persistence of AnalysisRun, Concept, ConceptEvidence, and ConceptRelationship in PostgreSQL", async () => {
    // 1. AnalysisRun
    const runs = await prisma.analysisRun.findMany({
      where: { courseId: bookCourseId },
      orderBy: { createdAt: "desc" },
    });
    expect(runs.length).toBeGreaterThanOrEqual(1);
    const latestRun = runs[0];
    expect(latestRun.status).toBe("completed");
    expect(latestRun.workspaceId).toBe(workspaceId);
    expect(latestRun.conceptsCount).toBeGreaterThan(0);
    expect(latestRun.completedAt).not.toBeNull();

    // 2. Concepts
    const concepts = await prisma.concept.findMany({
      where: { courseId: bookCourseId },
      include: { evidence: true },
    });
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts.length).toBe(latestRun.conceptsCount);
    for (const c of concepts) {
      expect(c.workspaceId).toBe(workspaceId);
      expect(c.name).toBeTruthy();
      expect(c.slug).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(c.confidence).toBeGreaterThan(0);
      expect(c.evidence.length).toBeGreaterThan(0);
    }

    // 3. Evidence
    const allEvidence = await prisma.conceptEvidence.findMany({
      where: { concept: { courseId: bookCourseId } },
      include: { concept: true, lesson: true },
    });
    expect(allEvidence.length).toBeGreaterThan(0);
    for (const ev of allEvidence) {
      expect(ev.excerpt.length).toBeGreaterThan(10);
      expect(ev.filePath).toBeTruthy();
      expect(ev.concept.courseId).toBe(bookCourseId);
    }

    // 4. Relationships
    const relationships = await prisma.conceptRelationship.findMany({
      where: { courseId: bookCourseId },
      include: { sourceConcept: true, targetConcept: true },
    });
    expect(relationships.length).toBeGreaterThanOrEqual(1);
    for (const rel of relationships) {
      expect(rel.sourceConcept.courseId).toBe(bookCourseId);
      expect(rel.targetConcept.courseId).toBe(bookCourseId);
      expect(rel.sourceConceptId).not.toBe(rel.targetConceptId);
    }
  });

  it("Step 6: Verifies provenance chain (Concept -> Evidence -> Lesson -> Raw Source Markdown)", async () => {
    const concepts = await prisma.concept.findMany({
      where: { courseId: bookCourseId },
      include: { evidence: { include: { lesson: true } } },
      take: 5,
    });

    expect(concepts.length).toBeGreaterThan(0);
    for (const concept of concepts) {
      for (const ev of concept.evidence) {
        expect(ev.filePath).toBeTruthy();
        expect(ev.excerpt).toBeTruthy();
        if (ev.lesson) {
          // Verify that substantive words from the excerpt exist in the lesson's raw source markdown
          const cleanMarkdown = ev.lesson.markdown.toLowerCase();
          const excerptWords = ev.excerpt
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 5);

          expect(excerptWords.length).toBeGreaterThan(0);
          const matchCount = excerptWords.filter((w) => cleanMarkdown.includes(w)).length;
          expect(matchCount / excerptWords.length).toBeGreaterThanOrEqual(0.8);
        }
      }
    }
  });

  it("Step 7: Verifies live idempotency (re-running without force does not duplicate DB rows)", async () => {
    const countsBefore = {
      runs: await prisma.analysisRun.count({ where: { courseId: bookCourseId } }),
      concepts: await prisma.concept.count({ where: { courseId: bookCourseId } }),
      evidence: await prisma.conceptEvidence.count({ where: { concept: { courseId: bookCourseId } } }),
      relationships: await prisma.conceptRelationship.count({ where: { courseId: bookCourseId } }),
    };

    // Re-run with force: false
    const rerunRes = await analyzeCourseIntelligence(testUserId, bookCourseId, { force: false });
    expect(rerunRes.ok).toBe(true);

    const countsAfter = {
      runs: await prisma.analysisRun.count({ where: { courseId: bookCourseId } }),
      concepts: await prisma.concept.count({ where: { courseId: bookCourseId } }),
      evidence: await prisma.conceptEvidence.count({ where: { concept: { courseId: bookCourseId } } }),
      relationships: await prisma.conceptRelationship.count({ where: { courseId: bookCourseId } }),
    };

    expect(countsAfter.runs).toBe(countsBefore.runs);
    expect(countsAfter.concepts).toBe(countsBefore.concepts);
    expect(countsAfter.evidence).toBe(countsBefore.evidence);
    expect(countsAfter.relationships).toBe(countsBefore.relationships);
  });

  it("Step 8: Verifies live tenant isolation (User B in Workspace B cannot access User A's intelligence)", async () => {
    const userBId = "test-live-user-forge-02-intruder";
    await prisma.user.upsert({
      where: { id: userBId },
      update: { email: "intruder@forge.dev", name: "Intruder User" },
      create: { id: userBId, email: "intruder@forge.dev", name: "Intruder User" },
    });
    await getOrCreateUserWorkspace(userBId, "Intruder Workspace");

    // User B attempts to access User A's course intelligence via authorized query
    const reportB = await getAuthorizedCourseIntelligence(userBId, bookCourseId);
    expect(reportB).toBeNull();

    // User B attempts to trigger analysis on User A's course
    const analyzeB = await analyzeCourseIntelligence(userBId, bookCourseId, { force: true });
    expect(analyzeB.ok).toBe(false);
    if (!analyzeB.ok) {
      expect(analyzeB.status).toBe(404);
    }
  });

  it("Step 9: Verifies failure safety when analyzing invalid / empty course", async () => {
    // Attempt to analyze non-existent course ID
    const failedRes = await analyzeCourseIntelligence(testUserId, "non-existent-course-id-9999");
    expect(failedRes.ok).toBe(false);
    if (!failedRes.ok) {
      expect(failedRes.status).toBe(404);
    }
  });

  it("Step 10: Extracts grounded source intelligence for Repository 1 (MunGell/awesome-for-beginners) into PostgreSQL", async () => {
    const course = await getAuthorizedCourseBySlug(testUserId, "awesome-for-beginners");
    expect(course).not.toBeNull();

    const analysisRes = await analyzeCourseIntelligence(testUserId, course!.id, { force: true });
    expect(analysisRes.ok).toBe(true);
    if (!analysisRes.ok) return;

    expect(analysisRes.report.concepts.length).toBeGreaterThan(0);
    expect(analysisRes.report.analysisRun?.status).toBe("completed");
  });

  it("Step 11: Resolves authorized topological learning path for rust-lang/book from PostgreSQL", async () => {
    const pathReport = await getAuthorizedLearningPath(testUserId, bookCourseId);
    expect(pathReport).not.toBeNull();
    if (!pathReport) return;

    expect(pathReport.totalConcepts).toBeGreaterThan(0);
    expect(pathReport.nodes.length).toBe(pathReport.totalConcepts);
    expect(pathReport.hasCycle).toBe(false);

    // Verify topological sequence numbering
    pathReport.nodes.forEach((node, idx) => {
      expect(node.sequenceOrder).toBe(idx + 1);
      expect(node.name).toBeTruthy();
      expect(node.slug).toBeTruthy();
      expect(node.learningObjective).toBeTruthy();
      expect(node.learningObjective.length).toBeGreaterThan(15);
      expect(node.prerequisites).toBeDefined();
    });

    // Verify nextRecommendedConceptId is assigned
    expect(pathReport.nextRecommendedConceptId).toBeTruthy();
    targetConceptId = pathReport.nextRecommendedConceptId!;

    const recommendedNode = pathReport.nodes.find((n) => n.conceptId === targetConceptId);
    expect(recommendedNode).toBeDefined();
    expect(recommendedNode!.isAvailable).toBe(true);
    expect(recommendedNode!.isCompleted).toBe(false);

    targetConceptName = recommendedNode!.name;
    targetEvidenceExcerpt = recommendedNode!.evidenceSnippet || "";
  });

  it("Step 12: Generates source-grounded practice prompt for recommended concept", async () => {
    expect(targetConceptId).toBeTruthy();

    const practicePrompt = await getAuthorizedConceptPractice(testUserId, targetConceptId);
    expect(practicePrompt).not.toBeNull();
    if (!practicePrompt) return;

    expect(practicePrompt.conceptId).toBe(targetConceptId);
    expect(practicePrompt.conceptName).toBe(targetConceptName);
    expect(practicePrompt.scenario).toBeTruthy();
    expect(practicePrompt.instructions).toBeTruthy();
    expect(practicePrompt.sourceEvidence.filePath).toBeTruthy();
    expect(practicePrompt.sourceEvidence.excerpt).toBeTruthy();
    expect(practicePrompt.rubricGuidelines.length).toBeGreaterThan(0);
  });

  it("Step 13: Evaluates and persists practice attempt to PostgreSQL, advancing concept completion", async () => {
    expect(targetConceptId).toBeTruthy();

    // Construct a grounded response addressing the concept name and key source evidence
    const cleanExcerptWords = targetEvidenceExcerpt
      .replace(/[*_`#[\]()]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
      .filter((w) => w.length >= 6);

    const anchorSubset = cleanExcerptWords.slice(0, 2).join(", ");
    const substantiveResponse = `Regarding ${targetConceptName}: this mechanism operates by enforcing strict rules within the architecture. Specifically, it directly prevents safety violations and ensures correctness because each requirement around ${anchorSubset || "memory safety and scoped access"} is verified. By structuring code to adhere to these rules, the system guarantees that execution flows predictably without undefined behavior or resource leaks.`;

    const submitRes = await submitAuthorizedPracticeAttempt(testUserId, targetConceptId, substantiveResponse);
    expect(submitRes.ok).toBe(true);
    if (!submitRes.ok) return;

    expect(submitRes.attemptId).toBeTruthy();
    expect(submitRes.evaluation.passed).toBe(true);
    expect(submitRes.evaluation.score).toBeGreaterThanOrEqual(70);
    expect(submitRes.evaluation.strengths.length).toBeGreaterThan(0);
    expect(submitRes.evaluation.sourceEvidenceExcerpt).toBeTruthy();

    // Verify row was persisted in PostgreSQL PracticeAttempt table
    const persistedAttempt = await prisma.practiceAttempt.findUnique({
      where: { id: submitRes.attemptId },
    });
    expect(persistedAttempt).not.toBeNull();
    expect(persistedAttempt!.userId).toBe(testUserId);
    expect(persistedAttempt!.conceptId).toBe(targetConceptId);
    expect(persistedAttempt!.passed).toBe(true);
    expect(persistedAttempt!.score).toBe(submitRes.evaluation.score);

    // Verify practice history query
    const history = await getAuthorizedPracticeHistory(testUserId, targetConceptId);
    expect(history).not.toBeNull();
    expect(history!.length).toBeGreaterThanOrEqual(1);
    expect(history![0].id).toBe(submitRes.attemptId);

    // Verify updated learning path reflects concept completion
    const updatedPath = await getAuthorizedLearningPath(testUserId, bookCourseId);
    expect(updatedPath).not.toBeNull();
    const updatedNode = updatedPath!.nodes.find((n) => n.conceptId === targetConceptId);
    expect(updatedNode?.isCompleted).toBe(true);
    expect(updatedPath!.completedConcepts).toBeGreaterThanOrEqual(1);
  });

  it("Step 14: Verifies live tenant isolation for learning path and practice submission", async () => {
    const intruderUserId = "test-live-user-forge-02-intruder";

    // 1. Intruder cannot access User A's learning path
    const intruderPath = await getAuthorizedLearningPath(intruderUserId, bookCourseId);
    expect(intruderPath).toBeNull();

    // 2. Intruder cannot access User A's practice prompt
    const intruderPrompt = await getAuthorizedConceptPractice(intruderUserId, targetConceptId);
    expect(intruderPrompt).toBeNull();

    // 3. Intruder cannot submit practice for User A's concept
    const intruderSubmit = await submitAuthorizedPracticeAttempt(
      intruderUserId,
      targetConceptId,
      "Unauthorized submission attempt trying to tamper with another tenant's concept."
    );
    expect(intruderSubmit.ok).toBe(false);
    if (!intruderSubmit.ok) {
      expect(intruderSubmit.status).toBe(404);
    }

    // 4. Intruder cannot access User A's practice history
    const intruderHistory = await getAuthorizedPracticeHistory(intruderUserId, targetConceptId);
    expect(intruderHistory).toBeNull();
  });

  it("Step 15: Resolves concept mastery state and generates diagnostic assessment prompt for rust-lang/book from PostgreSQL", async () => {
    expect(targetConceptId).toBeTruthy();

    const assessmentPrompt = await getAuthorizedConceptAssessment(testUserId, targetConceptId);
    expect(assessmentPrompt).not.toBeNull();
    if (!assessmentPrompt) return;

    expect(assessmentPrompt.conceptId).toBe(targetConceptId);
    expect(assessmentPrompt.conceptName).toBe(targetConceptName);
    expect(assessmentPrompt.taskType).toBeDefined();
    expect(["diagnostic_analysis", "architectural_invariant", "behavioral_prediction"]).toContain(assessmentPrompt.taskType);
    expect(assessmentPrompt.scenario).toBeTruthy();
    expect(assessmentPrompt.challenge).toBeTruthy();
    expect(assessmentPrompt.rubricGuidelines.length).toBeGreaterThan(0);
    expect(assessmentPrompt.sourceEvidence.excerpt).toBeTruthy();
    expect(assessmentPrompt.sourceEvidence.filePath).toBeTruthy();
    expect(typeof assessmentPrompt.canAssess).toBe("boolean");
  });

  it("Step 16: Evaluates and persists assessment attempt live, transitioning concept to demonstrated/mastered in PostgreSQL", async () => {
    expect(targetConceptId).toBeTruthy();

    const prompt = await getAuthorizedConceptAssessment(testUserId, targetConceptId);
    expect(prompt).not.toBeNull();
    if (!prompt) return;

    // Extract anchor words to ensure high passing score
    const cleanExcerptWords = prompt.sourceEvidence.excerpt
      .replace(/[*_`#[\]()]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
      .filter((w) => w.length >= 5);

    const anchorSubset = cleanExcerptWords.slice(0, 3).join(" ");

    const rigorousResponse = `Regarding ${targetConceptName}: The core architectural invariant and system guarantee is that it enforces strict correctness rules directly preventing runtime failures, invalid state transitions, and safety errors. Specifically, it guarantees that ${anchorSubset || "every resource access"} is verified before execution. The mechanism operates predictably because the system ensures invariants are preserved at every boundary.`;

    const submitRes = await submitAuthorizedAssessmentAttempt(
      testUserId,
      targetConceptId,
      rigorousResponse
    );

    expect(submitRes.ok).toBe(true);
    if (!submitRes.ok) return;

    expect(submitRes.evaluation.passed).toBe(true);
    expect(submitRes.evaluation.score).toBeGreaterThanOrEqual(70);
    expect(["demonstrated", "mastered"]).toContain(submitRes.evaluation.updatedMasteryState);

    // Verify row was persisted in PostgreSQL PracticeAttempt table with type="assessment"
    const persistedAttempt = await prisma.practiceAttempt.findUnique({
      where: { id: submitRes.attemptId },
    });
    expect(persistedAttempt).not.toBeNull();
    expect(persistedAttempt!.userId).toBe(testUserId);
    expect(persistedAttempt!.conceptId).toBe(targetConceptId);
    expect(persistedAttempt!.type).toBe("assessment");
    expect(persistedAttempt!.passed).toBe(true);

    // Verify ConceptMastery table in PostgreSQL was upserted
    const persistedMastery = await prisma.conceptMastery.findUnique({
      where: {
        userId_conceptId: { userId: testUserId, conceptId: targetConceptId },
      },
    });
    expect(persistedMastery).not.toBeNull();
    expect(persistedMastery!.state).toBe(submitRes.evaluation.updatedMasteryState);
    expect(persistedMastery!.bestScore).toBe(submitRes.evaluation.score);
    expect(persistedMastery!.attemptsCount).toBeGreaterThanOrEqual(1);

    // Verify getAuthorizedConceptMastery query returns full dossier
    const masteryDossier = await getAuthorizedConceptMastery(testUserId, targetConceptId);
    expect(masteryDossier).not.toBeNull();
    expect(masteryDossier!.state).toBe(submitRes.evaluation.updatedMasteryState);
    expect(masteryDossier!.bestScore).toBe(submitRes.evaluation.score);
    expect(masteryDossier!.history.some((h) => h.id === submitRes.attemptId && h.type === "assessment")).toBe(true);
  });

  it("Step 17: Verifies prerequisite-aware mastery blocking on live concept graph", async () => {
    // Find a downstream concept in the book course that has a prerequisite relationship
    const downstreamConcept = await prisma.concept.findFirst({
      where: {
        courseId: bookCourseId,
        id: { not: targetConceptId },
        toRelationships: {
          some: {
            type: { in: ["prerequisite", "depends_on"] },
          },
        },
      },
      include: {
        toRelationships: {
          where: { type: { in: ["prerequisite", "depends_on"] } },
          include: { sourceConcept: true },
        },
        evidence: true,
      },
    });

    expect(downstreamConcept).not.toBeNull();
    if (!downstreamConcept) return;

    const prereq = downstreamConcept.toRelationships[0].sourceConcept;

    // Ensure prerequisite is NOT demonstrated or mastered for testUserId
    await prisma.conceptMastery.deleteMany({
      where: {
        userId: testUserId,
        conceptId: prereq.id,
      },
    });

    // Verify the downstream concept's assessment prompt acknowledges the blocking prerequisite
    const prompt = await getAuthorizedConceptAssessment(testUserId, downstreamConcept.id);
    expect(prompt).not.toBeNull();
    if (!prompt) return;

    const prereqRef = prompt.prerequisites.find((p) => p.id === prereq.id);
    expect(prereqRef).toBeDefined();
    expect(prereqRef!.isSatisfied).toBe(false);

    // Submit a passing assessment response for this downstream concept
    const excerptWords = (prompt.sourceEvidence.excerpt || "")
      .replace(/[*_`#[\]()]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
      .filter((w) => w.length >= 5);

    const anchorSubset = excerptWords.slice(0, 3).join(" ");
    const passingResponse = `Regarding ${downstreamConcept.name}: The core invariant and architectural guarantee ensures memory safety and correctness because it strictly prevents failure states when handling ${anchorSubset || "system components"}. It operates predictably and enforces rules across components.`;

    const submitRes = await submitAuthorizedAssessmentAttempt(
      testUserId,
      downstreamConcept.id,
      passingResponse
    );

    expect(submitRes.ok).toBe(true);
    if (!submitRes.ok) return;

    // Strict invariant: passed assessment with unsatisfied prerequisite results in 'demonstrated', NOT 'mastered'
    expect(submitRes.evaluation.passed).toBe(true);
    expect(submitRes.evaluation.isPrerequisiteBlocked).toBe(true);
    expect(submitRes.evaluation.blockingPrerequisiteNames).toContain(prereq.name);
    expect(submitRes.evaluation.updatedMasteryState).toBe("demonstrated");

    const persistedMastery = await prisma.conceptMastery.findUnique({
      where: {
        userId_conceptId: { userId: testUserId, conceptId: downstreamConcept.id },
      },
    });
    expect(persistedMastery).not.toBeNull();
    expect(persistedMastery!.state).toBe("demonstrated");
    expect(persistedMastery!.masteredAt).toBeNull();
  });

  it("Step 18: Verifies failed-assessment revision loop and non-advancement", async () => {
    // Attempt an assessment with an inadequate response (< 25 chars)
    const failRes = await submitAuthorizedAssessmentAttempt(
      testUserId,
      targetConceptId,
      "Too brief."
    );

    expect(failRes.ok).toBe(true);
    if (!failRes.ok) return;

    expect(failRes.evaluation.passed).toBe(false);
    expect(failRes.evaluation.score).toBeLessThan(70);
    expect(failRes.evaluation.missing.length).toBeGreaterThan(0);
    expect(failRes.evaluation.suggestedNextStep).toContain("before retrying the assessment");
    expect(failRes.evaluation.sourceEvidenceExcerpt).toBeTruthy();
  });

  it("Step 19: Verifies assessment & mastery on second repository (MunGell/awesome-for-beginners)", async () => {
    const course = await getAuthorizedCourseBySlug(testUserId, "awesome-for-beginners");
    expect(course).not.toBeNull();
    if (!course) return;

    // Pick a concept from awesome-for-beginners
    const concept = await prisma.concept.findFirst({
      where: { courseId: course.id },
      include: { evidence: true },
    });
    expect(concept).not.toBeNull();
    if (!concept) return;

    // Generate prompt
    const prompt = await getAuthorizedConceptAssessment(testUserId, concept.id);
    expect(prompt).not.toBeNull();
    if (!prompt) return;

    expect(prompt.conceptId).toBe(concept.id);
    expect(prompt.sourceEvidence.excerpt).toBeTruthy();

    // Submit substantive response
    const words = prompt.sourceEvidence.excerpt
      .replace(/[*_`#[\]()]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())
      .filter((w) => w.length >= 5);
    const anchor = words.slice(0, 2).join(" ");

    const response = `Regarding ${concept.name}: This establishes clear contribution workflow rules and guidelines. It ensures that contributors adhere to standard practices because it guarantees consistency and prevents pull request errors and invalid submissions regarding ${anchor || "project standards"}.`;

    const res = await submitAuthorizedAssessmentAttempt(testUserId, concept.id, response);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.evaluation.passed).toBe(true);
    expect(["demonstrated", "mastered"]).toContain(res.evaluation.updatedMasteryState);

    // Verify ConceptMastery in PostgreSQL for awesome-for-beginners
    const mastery = await prisma.conceptMastery.findUnique({
      where: { userId_conceptId: { userId: testUserId, conceptId: concept.id } },
    });
    expect(mastery).not.toBeNull();
    expect(mastery!.workspaceId).toBe(workspaceId);
  });

  it("Step 20: Verifies live tenant isolation across assessment and mastery endpoints", async () => {
    const intruderUserId = "test-live-user-forge-02-intruder";

    // 1. Intruder cannot access User A's concept assessment
    const intruderPrompt = await getAuthorizedConceptAssessment(intruderUserId, targetConceptId);
    expect(intruderPrompt).toBeNull();

    // 2. Intruder cannot submit assessment for User A's concept
    const intruderSubmit = await submitAuthorizedAssessmentAttempt(
      intruderUserId,
      targetConceptId,
      "Unauthorized submission attempt trying to tamper with User A's mastery."
    );
    expect(intruderSubmit.ok).toBe(false);
    if (!intruderSubmit.ok) {
      expect(intruderSubmit.status).toBe(404);
    }

    // 3. Intruder cannot access User A's concept mastery report
    const intruderMastery = await getAuthorizedConceptMastery(intruderUserId, targetConceptId);
    expect(intruderMastery).toBeNull();
  });
});
