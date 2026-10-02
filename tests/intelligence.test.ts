import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  normalizeConceptSlug,
  extractLocalCandidatesFromUnit,
  synthesizeConceptsAndRelationships,
  SourceUnit,
} from "@/lib/server/intelligence/extractor";
import {
  ExtractionOutputSchema,
  ExtractedConceptSchema,
  ExtractedEvidenceSchema,
  ExtractedRelationshipSchema,
} from "@/lib/server/intelligence/types";
import { analyzeCourseIntelligence } from "@/lib/server/intelligence/pipeline";
import { getAuthorizedCourseIntelligence } from "@/lib/server/intelligence/queries";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: {
      findFirst: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
    },
    analysisRun: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    concept: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    conceptEvidence: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    conceptRelationship: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Source Intelligence: Stage A - Local AST Extraction", () => {
  it("normalizes concept names into canonical slugs for deduplication", () => {
    expect(normalizeConceptSlug("What is Ownership?")).toBe("ownership");
    expect(normalizeConceptSlug("Understanding Borrowing & Lifetimes")).toBe("borrowing-lifetimes");
    expect(normalizeConceptSlug("Introduction to Concurrency")).toBe("concurrency");
    expect(normalizeConceptSlug("Memory Safety in Rust")).toBe("memory-safety-in-rust");
  });

  it("extracts grounded concepts from markdown headings and body text", () => {
    const unit: SourceUnit = {
      id: "lesson-1",
      slug: "what-is-ownership",
      title: "Understanding Ownership",
      moduleTitle: "Chapter 4: Understanding Ownership",
      order: 4,
      filePath: "src/ch04-01-what-is-ownership.md",
      markdown: `
# Ownership Basics
Ownership is a set of rules that govern how a Rust program manages memory. All programs have to manage the way they use a computer's memory while running.

## The Stack and the Heap
Both the stack and the heap are parts of memory available to your code to use at runtime, but they are structured in different ways.

## Summary
In this section we summarized the rules of ownership.
`,
    };

    const candidates = extractLocalCandidatesFromUnit(unit);
    expect(candidates.length).toBe(2); // "Ownership Basics" and "The Stack and the Heap", "Summary" ignored

    const ownershipConcept = candidates.find((c) => c.name === "Ownership Basics");
    expect(ownershipConcept).toBeDefined();
    expect(ownershipConcept?.description).toContain("Ownership is a set of rules");
    expect(ownershipConcept?.confidence).toBeGreaterThanOrEqual(0.9);
    expect(ownershipConcept?.evidence.length).toBe(1);
    expect(ownershipConcept?.evidence[0].filePath).toBe("src/ch04-01-what-is-ownership.md");
    expect(ownershipConcept?.evidence[0].section).toBe("Ownership Basics");
    expect(ownershipConcept?.evidence[0].excerpt).toContain("Ownership is a set of rules");

    const stackConcept = candidates.find((c) => c.name === "The Stack and the Heap");
    expect(stackConcept).toBeDefined();
    expect(stackConcept?.evidence[0].section).toBe("The Stack and the Heap");
  });

  it("assigns foundational importance to early chapters and advanced to internals", () => {
    const foundationalUnit: SourceUnit = {
      id: "lesson-intro",
      slug: "getting-started",
      title: "Getting Started",
      moduleTitle: "Chapter 1: Getting Started",
      order: 1,
      filePath: "ch01-getting-started.md",
      markdown: `
## Installation
Installing the compiler and tooling to start building.
`,
    };

    const advancedUnit: SourceUnit = {
      id: "lesson-adv",
      slug: "concurrency",
      title: "Fearless Concurrency",
      moduleTitle: "Chapter 16: Concurrency",
      order: 16,
      filePath: "ch16-concurrency.md",
      markdown: `
## Fearless Concurrency Internals
Handling concurrent programming safely and efficiently.
`,
    };

    const foundCandidates = extractLocalCandidatesFromUnit(foundationalUnit);
    expect(foundCandidates[0].importance).toBe("foundational");

    const advCandidates = extractLocalCandidatesFromUnit(advancedUnit);
    expect(advCandidates[0].importance).toBe("advanced");
  });

  it("falls back to lesson title when no subheadings exist", () => {
    const unit: SourceUnit = {
      id: "lesson-fallback",
      slug: "pattern-matching",
      title: "Patterns and Matching",
      moduleTitle: "Chapter 18",
      order: 18,
      markdown: "Patterns are a special syntax in Rust for matching against the structure of types.",
    };

    const candidates = extractLocalCandidatesFromUnit(unit);
    expect(candidates.length).toBe(1);
    expect(candidates[0].name).toBe("Patterns and Matching");
    expect(candidates[0].evidence[0].excerpt).toContain("Patterns are a special syntax");
  });
});

describe("Source Intelligence: Stage B - Synthesis & Relationships", () => {
  it("deduplicates concepts across multiple lessons and combines evidence", () => {
    const candidate1 = {
      name: "Ownership",
      description: "Ownership manages memory.",
      importance: "core" as const,
      confidence: 0.9,
      evidence: [
        {
          filePath: "ch04-01.md",
          section: "Ownership",
          excerpt: "First explanation of ownership.",
          confidence: 1.0,
        },
      ],
    };

    const candidate2 = {
      name: "Understanding Ownership",
      description: "Comprehensive ownership rules in Rust.",
      importance: "foundational" as const,
      confidence: 0.95,
      evidence: [
        {
          filePath: "ch04-02.md",
          section: "Understanding Ownership",
          excerpt: "Second explanation of ownership rules.",
          confidence: 1.0,
        },
      ],
    };

    const units: SourceUnit[] = [
      { id: "u1", slug: "u1", title: "Ownership", moduleTitle: "M1", order: 1, markdown: "", filePath: "ch04-01.md" },
      { id: "u2", slug: "u2", title: "Understanding Ownership", moduleTitle: "M2", order: 2, markdown: "", filePath: "ch04-02.md" },
    ];

    const synthesis = synthesizeConceptsAndRelationships([candidate1, candidate2], units);
    expect(synthesis.concepts.length).toBe(1); // Merged to 1 canonical concept
    expect(synthesis.concepts[0].importance).toBe("foundational"); // Upgraded
    expect(synthesis.concepts[0].confidence).toBe(0.95);
    expect(synthesis.concepts[0].evidence.length).toBe(2); // Both evidence excerpts preserved
  });

  it("infers prerequisite relationships from foundational order and text references", () => {
    const foundationalConcept = {
      name: "Memory Safety",
      description: "How memory is allocated safely without a garbage collector.",
      importance: "foundational" as const,
      confidence: 0.95,
      evidence: [
        {
          filePath: "ch01.md",
          section: "Memory Safety",
          excerpt: "Rust guarantees memory safety without garbage collection.",
          confidence: 1.0,
        },
      ],
    };

    const dependentConcept = {
      name: "Smart Pointers",
      description: "Smart pointers provide extra capabilities beyond references.",
      importance: "core" as const,
      confidence: 0.9,
      evidence: [
        {
          filePath: "ch15.md",
          section: "Smart Pointers",
          excerpt: "Smart pointers build directly on Rust memory concepts and ownership.",
          confidence: 1.0,
        },
      ],
    };

    const units: SourceUnit[] = [
      { id: "u1", slug: "u1", title: "Memory Safety", moduleTitle: "Intro", order: 1, markdown: "", filePath: "ch01.md" },
      { id: "u2", slug: "u2", title: "Smart Pointers", moduleTitle: "Pointers", order: 15, markdown: "", filePath: "ch15.md" },
    ];

    const synthesis = synthesizeConceptsAndRelationships([foundationalConcept, dependentConcept], units);
    expect(synthesis.relationships.length).toBeGreaterThanOrEqual(1);

    const prereq = synthesis.relationships.find(
      (r) => r.sourceConceptName === "Memory Safety" && r.targetConceptName === "Smart Pointers"
    );
    expect(prereq).toBeDefined();
    expect(prereq?.type).toBe("prerequisite");
  });
});

describe("Source Intelligence: Schema Validation & Adversarial Hardening", () => {
  it("rejects evidence with confidence out of bounds", () => {
    const invalidEvidence = {
      filePath: "src/main.rs",
      section: "Intro",
      excerpt: "Some text",
      confidence: 1.5, // Exceeds 1.0
    };
    expect(ExtractedEvidenceSchema.safeParse(invalidEvidence).success).toBe(false);
  });

  it("rejects concepts with empty evidence arrays", () => {
    const ungroundedConcept = {
      name: "Hallucinated Concept",
      description: "A concept without any source evidence.",
      importance: "core",
      confidence: 0.8,
      evidence: [], // Empty evidence rejected
    };
    expect(ExtractedConceptSchema.safeParse(ungroundedConcept).success).toBe(false);
  });

  it("rejects invalid relationship types", () => {
    const invalidRel = {
      sourceConceptName: "A",
      targetConceptName: "B",
      type: "invented_relationship",
      confidence: 0.9,
      reason: "Invalid relation",
      evidenceExcerpt: "excerpt",
    };
    expect(ExtractedRelationshipSchema.safeParse(invalidRel).success).toBe(false);
  });

  it("validates well-formed ExtractionOutput schema", () => {
    const validOutput = {
      concepts: [
        {
          name: "Variables and Mutability",
          description: "By default variables in Rust are immutable.",
          importance: "foundational",
          confidence: 0.95,
          evidence: [
            {
              filePath: "ch03-01.md",
              section: "Variables",
              excerpt: "In Rust, variables are immutable by default.",
              confidence: 1.0,
            },
          ],
        },
      ],
      relationships: [],
    };
    const res = ExtractionOutputSchema.safeParse(validOutput);
    expect(res.success).toBe(true);
  });
});

describe("Source Intelligence: Tenant Isolation & Queries", () => {
  it("returns null when requesting intelligence for a course not in user's workspace", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue(null);

    const result = await getAuthorizedCourseIntelligence("unauthorized-user", "course-123");
    expect(result).toBeNull();
  });

  it("returns full structured report when user is authorized in workspace", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({ id: "course-123" } as unknown as Awaited<ReturnType<typeof prisma.course.findFirst>>);
    vi.mocked(prisma.analysisRun.findFirst).mockResolvedValue({
      id: "run-1",
      status: "completed",
      version: 1,
      model: "deterministic-ast",
      errorMessage: null,
      conceptsCount: 1,
      relationshipsCount: 0,
      durationMs: 45,
      completedAt: new Date("2026-09-10T08:00:00Z"),
    } as unknown as Awaited<ReturnType<typeof prisma.analysisRun.findFirst>>);

    vi.mocked(prisma.concept.findMany).mockResolvedValue([
      {
        id: "c1",
        name: "Ownership",
        slug: "ownership",
        description: "Memory management rules",
        importance: "foundational",
        confidence: 0.95,
        evidence: [
          {
            id: "ev1",
            filePath: "ch04.md",
            lessonId: "l1",
            section: "Ownership",
            excerpt: "Rules of ownership.",
            confidence: 1.0,
            lesson: { slug: "ch04-ownership" },
          },
        ],
        fromRelationships: [],
        toRelationships: [],
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.concept.findMany>>);

    vi.mocked(prisma.conceptRelationship.findMany).mockResolvedValue([]);

    const report = await getAuthorizedCourseIntelligence("authorized-user", "course-123");
    expect(report).not.toBeNull();
    expect(report?.analysisRun?.status).toBe("completed");
    expect(report?.concepts.length).toBe(1);
    expect(report?.concepts[0].name).toBe("Ownership");
    expect(report?.concepts[0].evidence[0].lessonSlug).toBe("ch04-ownership");
  });
});

describe("Source Intelligence: Pipeline Execution & Idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing completed analysis when force is false (idempotent)", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      id: "c-123",
      workspaceId: "ws-1",
      title: "Existing Course",
    } as unknown as Awaited<ReturnType<typeof prisma.course.findFirst>>);

    vi.mocked(prisma.analysisRun.findFirst).mockResolvedValue({
      id: "existing-run",
      status: "completed",
      courseId: "c-123",
    } as unknown as Awaited<ReturnType<typeof prisma.analysisRun.findFirst>>);

    // Mock query result
    vi.mocked(prisma.concept.findMany).mockResolvedValue([]);
    vi.mocked(prisma.conceptRelationship.findMany).mockResolvedValue([]);

    const result = await analyzeCourseIntelligence("user-1", "c-123", { force: false });
    expect(result.ok).toBe(true);
    // Should NOT create a new run or delete existing concepts
    expect(prisma.analysisRun.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("fails gracefully when course has zero lessons", async () => {
    vi.mocked(prisma.course.findFirst).mockResolvedValue({
      id: "empty-course",
      workspaceId: "ws-1",
      title: "Empty Course",
      modules: [], // No modules or lessons
    } as unknown as Awaited<ReturnType<typeof prisma.course.findFirst>>);

    vi.mocked(prisma.analysisRun.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.analysisRun.create).mockResolvedValue({
      id: "run-empty",
      status: "processing",
    } as unknown as Awaited<ReturnType<typeof prisma.analysisRun.create>>);
    vi.mocked(prisma.analysisRun.update).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.analysisRun.update>>);

    const result = await analyzeCourseIntelligence("user-1", "empty-course", { force: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toContain("no lessons");
    }
  });
});
