import { resetEnvCache } from "@/lib/env";
afterEach(() => { vi.unstubAllEnvs(); resetEnvCache(); });
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  generateAssessmentPrompt,
  evaluateAssessmentSubmissionDeterministic,
} from "@/lib/server/assessment/evaluator";
import { evaluateMasteryPolicy } from "@/lib/server/assessment/mastery";
import {
  getAuthorizedConceptAssessment,
  submitAuthorizedAssessmentAttempt,
  getAuthorizedConceptMastery,
} from "@/lib/server/assessment/service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    concept: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    conceptMastery: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    progress: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    practiceAttempt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Assessment Prompt Generation: Grounded & Prerequisite-Aware", () => {
  const conceptDiagnostic = {
    id: "c-ownership",
    name: "Borrow Checker Invariants",
    slug: "borrow-checker-invariants",
    description: "Enforces aliasing XOR mutability rules at compile time",
    importance: "core",
  };

  const conceptArch = {
    id: "c-arch",
    name: "Compiler Pipeline Architecture",
    slug: "compiler-pipeline-architecture",
    description: "AST lowering to HIR, MIR, and LLVM bytecode",
    importance: "architectural",
  };

  const conceptGeneral = {
    id: "c-patterns",
    name: "Idiomatic Error Handling",
    slug: "idiomatic-error-handling",
    description: "Result and Option types with ? operator propagation",
    importance: "foundational",
  };

  const evidenceOwnership = {
    filePath: "src/borrowck.rs",
    section: "Borrow Checker Rules",
    excerpt: "At any given time, you can have either one mutable reference or any number of immutable references. References must always be valid.",
  };

  it("selects diagnostic_analysis task for safety, concurrency, or memory concepts", () => {
    const prompt = generateAssessmentPrompt(
      conceptDiagnostic,
      "Diagnose borrow checker rules",
      evidenceOwnership,
      [],
      "not_started"
    );

    expect(prompt.taskType).toBe("diagnostic_analysis");
    expect(prompt.challenge).toContain("Diagnose how \"Borrow Checker Invariants\" guarantees correctness");
    expect(prompt.rubricGuidelines.length).toBeGreaterThan(0);
    expect(prompt.canAssess).toBe(true);
  });

  it("selects architectural_invariant task for pipeline and architecture concepts", () => {
    const prompt = generateAssessmentPrompt(
      conceptArch,
      "Explain compilation pipeline stages",
      {
        filePath: "src/compiler.rs",
        section: "Pipeline Stages",
        excerpt: "The compiler pipeline processes tokens, lowers into High-Level IR, Mid-Level IR, and generates machine target code.",
      },
      [],
      "not_started"
    );

    expect(prompt.taskType).toBe("architectural_invariant");
    expect(prompt.challenge).toContain("architectural invariants");
    expect(prompt.canAssess).toBe(true);
  });

  it("selects behavioral_prediction task for general concepts", () => {
    const prompt = generateAssessmentPrompt(
      conceptGeneral,
      "Explain error propagation with Result",
      {
        filePath: "src/errors.rs",
        section: "Result Monad",
        excerpt: "Errors are handled using Result<T, E> where the question mark operator early-returns Err variants safely.",
      },
      [],
      "not_started"
    );

    expect(prompt.taskType).toBe("behavioral_prediction");
    expect(prompt.challenge).toContain("Predict and explain how");
  });

  it("blocks canAssess when unsatisfied prerequisites are not_started", () => {
    const prompt = generateAssessmentPrompt(
      conceptDiagnostic,
      "Diagnose memory invariants",
      evidenceOwnership,
      [
        { id: "p1", name: "Stack and Heap Allocation", slug: "stack-heap", state: "not_started", isSatisfied: false },
        { id: "p2", name: "Ownership Move Semantics", slug: "ownership", state: "demonstrated", isSatisfied: true },
      ],
      "not_started"
    );

    expect(prompt.canAssess).toBe(false);
    expect(prompt.blockingPrerequisiteNames).toEqual(["Stack and Heap Allocation"]);
  });

  it("allows canAssess when prerequisites are in progress or satisfied", () => {
    const prompt = generateAssessmentPrompt(
      conceptDiagnostic,
      "Diagnose memory invariants",
      evidenceOwnership,
      [
        { id: "p1", name: "Stack and Heap Allocation", slug: "stack-heap", state: "learning", isSatisfied: false },
        { id: "p2", name: "Ownership Move Semantics", slug: "ownership", state: "demonstrated", isSatisfied: true },
      ],
      "learning"
    );

    expect(prompt.canAssess).toBe(true);
    expect(prompt.blockingPrerequisiteNames).toEqual([]);
  });
});

describe("Deterministic Assessment Evaluator: Rubric, Thresholds & Feedback", () => {
  const mockPrompt = {
    conceptId: "concept-borrowck",
    conceptName: "Borrow Checker Invariants",
    conceptSlug: "borrow-checker-invariants",
    learningObjective: "Master compile-time memory safety invariants",
    taskType: "diagnostic_analysis" as const,
    scenario: "Investigate concurrent aliasing safety",
    challenge: "Explain how references enforce safety and prevent data races",
    sourceEvidence: {
      filePath: "src/borrowck.rs",
      section: "Aliasing XOR Mutability",
      excerpt: "At any given time, you can have either one mutable reference or any number of immutable references. References must always be valid to prevent dangling pointers.",
    },
    rubricGuidelines: [
      "Clearly articulate the invariants and purpose of Borrow Checker Invariants",
      "Explain the operational role of reference",
      "Explain the operational role of mutable",
      "Explain what failure mode or data race is prevented",
    ],
    prerequisites: [
      { id: "p-ownership", name: "Ownership", slug: "ownership", state: "demonstrated" as const, isSatisfied: true },
    ],
    canAssess: true,
    blockingPrerequisiteNames: [],
    currentMasteryState: "learning" as const,
  };

  it("rejects responses that are too brief (< 25 characters)", () => {
    const result = evaluateAssessmentSubmissionDeterministic(
      mockPrompt,
      "Too brief.",
      0,
      0
    );

    expect(result.passed).toBe(false);
    expect(result.score).toBe(20);
    expect(result.missing.some((m) => m.includes("too brief"))).toBe(true);
    expect(result.updatedMasteryState).toBe("learning");
  });

  it("evaluates a thorough, source-grounded response with high passing score", () => {
    const thoroughSubmission = `
      In Rust, Borrow Checker Invariants ensure memory safety at compile time without a garbage collector.
      Specifically, the core invariant is aliasing XOR mutability: at any point in time, code can have either
      one mutable reference or any number of immutable references, but never both simultaneously.
      This invariant strictly prevents data races and dangling pointer failure modes. References must always
      point to valid initialized memory and cannot outlive the lifetime of the underlying owner.
    `;

    const result = evaluateAssessmentSubmissionDeterministic(
      mockPrompt,
      thoroughSubmission,
      0,
      0
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.updatedMasteryState).toBe("mastered");
    expect(result.isPrerequisiteBlocked).toBe(false);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.suggestedNextStep).toContain("mastered");
  });

  it("evaluates a partial response below passing threshold and provides revision guidance", () => {
    const partialSubmission = `
      The system uses references to inspect values without taking full ownership.
      It does this through the compiler which checks syntax and types before running.
    `;

    const result = evaluateAssessmentSubmissionDeterministic(
      mockPrompt,
      partialSubmission,
      0,
      0
    );

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
    expect(result.updatedMasteryState).toBe("learning");
    expect(result.suggestedNextStep).toContain("Review the source excerpt");
    expect(result.sourceEvidenceExcerpt).toBe(mockPrompt.sourceEvidence.excerpt);
  });
});

describe("Mastery Policy: Invariants & Prerequisite Blocking", () => {
  it("transitions from learning to demonstrated on passing score (70-84) without prior pass", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "learning",
      assessmentPassed: true,
      assessmentScore: 78,
      priorAttemptsCount: 0,
      priorPassedCount: 0,
      prerequisites: [
        { id: "p1", name: "Ownership", slug: "ownership", state: "demonstrated", isSatisfied: true },
      ],
    });

    expect(outcome.state).toBe("demonstrated");
    expect(outcome.isPrerequisiteBlocked).toBe(false);
  });

  it("elevates to mastered when score >= 85 and all prerequisites are satisfied", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "learning",
      assessmentPassed: true,
      assessmentScore: 92,
      priorAttemptsCount: 0,
      priorPassedCount: 0,
      prerequisites: [
        { id: "p1", name: "Ownership", slug: "ownership", state: "mastered", isSatisfied: true },
      ],
    });

    expect(outcome.state).toBe("mastered");
    expect(outcome.isPrerequisiteBlocked).toBe(false);
  });

  it("elevates to mastered when score is 75 and learner has demonstrated consistency (priorPassedCount >= 1)", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "demonstrated",
      assessmentPassed: true,
      assessmentScore: 75,
      priorAttemptsCount: 1,
      priorPassedCount: 1,
      prerequisites: [
        { id: "p1", name: "Ownership", slug: "ownership", state: "demonstrated", isSatisfied: true },
      ],
    });

    expect(outcome.state).toBe("mastered");
    expect(outcome.isPrerequisiteBlocked).toBe(false);
  });

  it("STRICT INVARIANT: blocks full mastery when a prerequisite is unsatisfied even with 100/100 score", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "learning",
      assessmentPassed: true,
      assessmentScore: 100,
      priorAttemptsCount: 0,
      priorPassedCount: 0,
      prerequisites: [
        { id: "p1", name: "Memory Model", slug: "memory-model", state: "learning", isSatisfied: false },
      ],
    });

    // Demonstrated only, NOT mastered!
    expect(outcome.state).toBe("demonstrated");
    expect(outcome.isPrerequisiteBlocked).toBe(true);
    expect(outcome.blockingPrerequisiteNames).toEqual(["Memory Model"]);
    expect(outcome.reason).toContain("Full mastery is pending until prerequisite \"Memory Model\" is demonstrated");
  });

  it("keeps state as learning on failed assessment (< 70)", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "learning",
      assessmentPassed: false,
      assessmentScore: 55,
      priorAttemptsCount: 1,
      priorPassedCount: 0,
      prerequisites: [],
    });

    expect(outcome.state).toBe("learning");
    expect(outcome.reason).toContain("did not meet the passing threshold (70)");
  });

  it("downgrades from mastered to demonstrated if an existing mastered concept fails an assessment", () => {
    const outcome = evaluateMasteryPolicy({
      currentState: "mastered",
      assessmentPassed: false,
      assessmentScore: 40,
      priorAttemptsCount: 3,
      priorPassedCount: 2,
      prerequisites: [],
    });

    expect(outcome.state).toBe("demonstrated");
  });
});

describe("Authorized Assessment Service: Database Transactions & Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when user is not a member of the concept's workspace", async () => {
    vi.mocked(prisma.concept.findFirst).mockResolvedValueOnce(null);

    const prompt = await getAuthorizedConceptAssessment("unauthorized-user", "concept-123");
    expect(prompt).toBeNull();
  });

  it("returns authorized assessment prompt with prerequisite state for authorized user", async () => {
    const mockConcept = {
      id: "concept-123",
      name: "Borrow Checker",
      slug: "borrow-checker",
      description: "Compile-time safety",
      importance: "core",
      workspaceId: "ws-1",
      evidence: [
        { filePath: "src/borrow.rs", section: "Rules", excerpt: "One mutable or many immutable references.", lessonId: "l-1" },
      ],
      toRelationships: [
        {
          type: "prerequisite",
          confidence: 0.9,
          sourceConcept: { id: "p-ownership", name: "Ownership", slug: "ownership" },
        },
      ],
    };

    vi.mocked(prisma.concept.findFirst).mockResolvedValueOnce(mockConcept as unknown as Awaited<ReturnType<typeof prisma.concept.findFirst>>);
    vi.mocked(prisma.conceptMastery.findMany).mockResolvedValueOnce([
      { id: "cm-1", userId: "u-1", conceptId: "p-ownership", workspaceId: "ws-1", state: "demonstrated", demonstratedAt: new Date(), masteredAt: null, createdAt: new Date(), updatedAt: new Date(), bestScore: 80, attemptsCount: 1 },
    ]);
    vi.mocked(prisma.conceptMastery.findUnique).mockResolvedValueOnce({
      id: "cm-2",
      userId: "u-1",
      conceptId: "concept-123",
      workspaceId: "ws-1",
      state: "learning",
      demonstratedAt: null,
      masteredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      bestScore: 50,
      attemptsCount: 1,
    });

    const prompt = await getAuthorizedConceptAssessment("u-1", "concept-123");
    expect(prompt).not.toBeNull();
    expect(prompt?.conceptId).toBe("concept-123");
    expect(prompt?.canAssess).toBe(true);
    expect(prompt?.prerequisites[0].isSatisfied).toBe(true);
    expect(prompt?.currentMasteryState).toBe("learning");
  });

  it("submits assessment, atomically writes PracticeAttempt and updates ConceptMastery", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key"); resetEnvCache();
    const mockConcept = {
      id: "concept-123",
      name: "Borrow Checker",
      slug: "borrow-checker",
      description: "Compile-time safety",
      importance: "core",
      workspaceId: "ws-1",
      evidence: [
        { filePath: "src/borrow.rs", section: "Rules", excerpt: "One mutable or many immutable references.", lessonId: "l-1" },
      ],
      toRelationships: [],
    };

    // 1st findFirst: getAuthorizedConceptAssessment
    vi.mocked(prisma.concept.findFirst).mockResolvedValueOnce(mockConcept as unknown as Awaited<ReturnType<typeof prisma.concept.findFirst>>);
    // 2nd findUnique: in submitAuthorizedAssessmentAttempt
    vi.mocked(prisma.concept.findUnique).mockResolvedValueOnce({ workspaceId: "ws-1" } as unknown as Awaited<ReturnType<typeof prisma.concept.findUnique>>);
    vi.mocked(prisma.conceptMastery.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.conceptMastery.findUnique).mockResolvedValueOnce(null);
    vi.mocked(prisma.practiceAttempt.findMany).mockResolvedValueOnce([]);

    // Mock interactive transaction
    const mockCreatedAttempt = {
      id: "attempt-1",
      conceptId: "concept-123",
      userId: "u-1",
      type: "assessment",
      score: 85,
      passed: true,
      feedback: "Great job",
    };
    const mockUpsertedMastery = {
      id: "cm-1",
      userId: "u-1",
      conceptId: "concept-123",
      workspaceId: "ws-1",
      state: "mastered",
    };

    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: unknown) => {
      const txFn = callback as (tx: unknown) => Promise<unknown>;
      return txFn({
        $queryRaw: vi.fn().mockResolvedValue([]),
        practiceAttempt: {
          create: vi.fn().mockResolvedValue(mockCreatedAttempt),
          count: vi.fn().mockResolvedValue(0),
        },
        conceptMastery: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue(mockUpsertedMastery),
        },
      });
    });

    const result = await submitAuthorizedAssessmentAttempt(
      "u-1",
      "concept-123",
      "Borrow Checker enforces that you can have one mutable or many immutable references, preventing races and dangling pointers.",
      vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: JSON.stringify({ score: 85, passed: true, strengths: ["Explains constraints"], missing: [], feedback: "Grounded in the cited source." }) } }] }))
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.evaluation.passed).toBe(true);
      expect(result.evaluation.updatedMasteryState).toBe("mastered");
    }
  });

  it("retrieves full concept mastery dossier for authorized user", async () => {
    const mockConcept = {
      id: "concept-123",
      name: "Borrow Checker",
      slug: "borrow-checker",
      description: "Compile-time safety",
      importance: "core",
      workspaceId: "ws-1",
      evidence: [
        { filePath: "src/borrow.rs", section: "Rules", excerpt: "One mutable or many immutable references.", lessonId: "l-1" },
      ],
      toRelationships: [],
      practiceAttempts: [
        {
          id: "att-1",
          score: 90,
          passed: true,
          type: "assessment",
          createdAt: new Date(),
          feedback: "Great",
          strengths: ["Clear"],
          missing: [],
        },
      ],
    };

    vi.mocked(prisma.concept.findFirst).mockResolvedValueOnce(mockConcept as unknown as Awaited<ReturnType<typeof prisma.concept.findFirst>>);
    vi.mocked(prisma.conceptMastery.findMany).mockResolvedValueOnce([]);
    vi.mocked(prisma.conceptMastery.findUnique).mockResolvedValueOnce({
      id: "cm-1",
      userId: "u-1",
      conceptId: "concept-123",
      workspaceId: "ws-1",
      state: "mastered",
      demonstratedAt: new Date(),
      masteredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      bestScore: 90,
      attemptsCount: 1,
    });

    const report = await getAuthorizedConceptMastery("u-1", "concept-123");
    expect(report).not.toBeNull();
    expect(report?.state).toBe("mastered");
    expect(report?.attemptsCount).toBe(1);
    expect(report?.bestScore).toBe(90);
    expect(report?.history.length).toBe(1);
  });
});
