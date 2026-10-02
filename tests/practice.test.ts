import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  generatePracticePrompt,
  evaluatePracticeSubmissionDeterministic,
} from "@/lib/server/practice/evaluator";
import {
  getAuthorizedConceptPractice,
  submitAuthorizedPracticeAttempt,
  getAuthorizedPracticeHistory,
} from "@/lib/server/practice/service";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    concept: {
      findFirst: vi.fn(),
    },
    practiceAttempt: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Practice Prompt Generation: Source Grounding", () => {
  it("generates architectural reasoning task for systems/memory concepts", () => {
    const prompt = generatePracticePrompt(
      {
        id: "concept-1",
        name: "Ownership & Borrowing",
        slug: "ownership-borrowing",
        description: "Rust memory management without garbage collection",
        importance: "core",
      },
      "Reason about ownership rules and compiler guarantees",
      {
        filePath: "src/ownership.rs",
        section: "Borrow Checker",
        excerpt: "Each value in Rust has an owner. There can only be one owner at a time. When the owner goes out of scope, the value will be dropped.",
      }
    );

    expect(prompt.conceptId).toBe("concept-1");
    expect(prompt.taskType).toBe("architectural_reasoning");
    expect(prompt.scenario).toContain("Ownership & Borrowing");
    expect(prompt.rubricGuidelines.length).toBeGreaterThan(0);
    expect(prompt.sourceEvidence.filePath).toBe("src/ownership.rs");
    expect(prompt.sourceEvidence.excerpt).toContain("Each value in Rust has an owner");
  });

  it("generates procedural explanation for setup/contributing guides", () => {
    const prompt = generatePracticePrompt(
      {
        id: "concept-2",
        name: "Contributing Requirements Guide",
        slug: "contributing-requirements-guide",
        description: "Steps to submit a pull request",
        importance: "foundational",
      },
      "Follow contribution workflow",
      {
        filePath: "CONTRIBUTING.md",
        section: "Pull Requests",
        excerpt: "Ensure all tests pass with cargo test and format code with cargo fmt before submitting.",
      }
    );

    expect(prompt.taskType).toBe("procedural_explanation");
    expect(prompt.scenario).toContain("onboarding a new engineer");
  });
});

describe("Deterministic Practice Evaluator: Offline & Rubric-Driven", () => {
  const mockPrompt = {
    conceptId: "concept-ownership",
    conceptName: "Ownership",
    conceptSlug: "ownership",
    learningObjective: "Understand ownership move semantics and dropping",
    taskType: "architectural_reasoning" as const,
    scenario: "Explain how Rust ensures memory safety without GC",
    instructions: "Explain the ownership rules and what happens when values go out of scope.",
    sourceEvidence: {
      filePath: "book/ch04.md",
      section: "What is Ownership?",
      excerpt: "Each value in Rust has an owner. When the owner goes out of scope, the value will be dropped. Values allocate heap memory safely.",
    },
    rubricGuidelines: [
      "Address or explain the role of 'owner'",
      "Address or explain the role of 'scope'",
      "Address or explain the role of 'dropped'",
    ],
  };

  it("rejects responses that are too short (< 25 characters)", () => {
    const result = evaluatePracticeSubmissionDeterministic(mockPrompt, "Rust is very safe.");
    expect(result.passed).toBe(false);
    expect(result.score).toBe(20);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing[0]).toContain("too brief");
    expect(result.sourceEvidenceExcerpt).toBe(mockPrompt.sourceEvidence.excerpt);
    expect(result.suggestedNextStep).toContain("book/ch04.md");
  });

  it("evaluates a thorough response with high score (>= 70) and passing verdict", () => {
    const goodResponse =
      "In Rust, Ownership is the core mechanism where every value has a unique owner. When that owner goes out of scope, the memory is dropped automatically, which prevents memory leaks and ensures memory safety without a garbage collector.";

    const result = evaluatePracticeSubmissionDeterministic(mockPrompt, goodResponse);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.feedback).toContain("Strong work");
    expect(result.suggestedNextStep).toContain("Proceed to the next concept");
  });

  it("evaluates an incomplete response with revision recommendation and identifies missing points", () => {
    const partialResponse =
      "Ownership is used in Rust for tracking variables across functions and assignments.";

    const result = evaluatePracticeSubmissionDeterministic(mockPrompt, partialResponse);
    // Mentions ownership (+20) + base (35) = 55 (< 70)
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(70);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.suggestedNextStep).toContain("Re-examine the evidence excerpt");
  });
});

describe("Authorized Practice Service & Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces tenant isolation when fetching practice prompt", async () => {
    (prisma.concept.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const practice = await getAuthorizedConceptPractice("attacker-user", "concept-123");
    expect(practice).toBeNull();
  });

  it("enforces tenant isolation and rejects unauthorized practice submission", async () => {
    (prisma.concept.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await submitAuthorizedPracticeAttempt(
      "attacker-user",
      "concept-123",
      "Valid looking response about memory and safety."
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(404);
      expect(result.error).toContain("unauthorized");
    }
  });

  it("evaluates and persists practice attempt to PostgreSQL for authorized user", async () => {
    const mockConcept = {
      id: "concept-1",
      name: "Borrowing",
      slug: "borrowing",
      description: "References and borrowing rules in Rust",
      importance: "core",
      workspaceId: "ws-test",
      evidence: [
        {
          filePath: "src/borrow.rs",
          section: "Rules",
          excerpt: "You can have either one mutable reference or any number of immutable references.",
        },
      ],
    };

    (prisma.concept.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockConcept);

    (prisma.practiceAttempt.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "attempt-xyz",
      userId: "user-test",
      conceptId: "concept-1",
      workspaceId: "ws-test",
      score: 85,
      passed: true,
      feedback: "Strong work!",
      createdAt: new Date(),
    });

    const result = await submitAuthorizedPracticeAttempt(
      "user-test",
      "concept-1",
      "Borrowing allows referencing data without taking ownership. You can have any number of immutable references or exactly one mutable reference at a time."
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attemptId).toBe("attempt-xyz");
      expect(result.evaluation.passed).toBe(true);
      expect(result.evaluation.score).toBeGreaterThanOrEqual(70);
    }

    expect(prisma.practiceAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-test",
          conceptId: "concept-1",
          workspaceId: "ws-test",
          passed: true,
        }),
      })
    );
  });

  it("retrieves practice attempt history for authorized concept", async () => {
    (prisma.concept.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "concept-1",
      workspaceId: "ws-1",
    });

    const mockAttempts = [
      {
        id: "att-1",
        conceptId: "concept-1",
        userId: "user-1",
        prompt: "Prompt text",
        response: "Response text",
        passed: true,
        score: 85,
        feedback: "Great",
        strengths: ["Clear reasoning"],
        missing: [],
        createdAt: new Date("2026-09-23T08:00:00Z"),
      },
    ];

    (prisma.practiceAttempt.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockAttempts);

    const history = await getAuthorizedPracticeHistory("user-1", "concept-1");
    expect(history).not.toBeNull();
    expect(history!.length).toBe(1);
    expect(history![0].id).toBe("att-1");
    expect(history![0].passed).toBe(true);
  });
});
