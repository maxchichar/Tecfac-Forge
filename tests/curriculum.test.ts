import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  computeCurriculumOrder,
  ConceptOrderingInput,
  RelationshipOrderingInput,
} from "@/lib/server/curriculum/ordering";
import { deriveLearningObjective } from "@/lib/server/curriculum/objectives";
import { getAuthorizedLearningPath } from "@/lib/server/curriculum/learning-path";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: {
      findFirst: vi.fn(),
    },
    concept: {
      findMany: vi.fn(),
    },
    conceptRelationship: {
      findMany: vi.fn(),
    },
    progress: {
      findMany: vi.fn(),
    },
    practiceAttempt: {
      findMany: vi.fn(),
    },
    conceptMastery: {
      findMany: vi.fn(),
    },
  },
}));

describe("Curriculum Ordering: Topological Sort & Resilience", () => {
  it("handles empty concepts cleanly", () => {
    const result = computeCurriculumOrder([], []);
    expect(result.orderedConcepts).toEqual([]);
    expect(result.hasCycle).toBe(false);
  });

  it("orders a linear dependency chain (A -> B -> C) correctly", () => {
    const concepts: ConceptOrderingInput[] = [
      { id: "c-c", name: "Concurrency", slug: "concurrency", importance: "advanced", confidence: 0.9 },
      { id: "c-a", name: "Variables", slug: "variables", importance: "foundational", confidence: 0.95 },
      { id: "c-b", name: "Ownership", slug: "ownership", importance: "core", confidence: 0.9 },
    ];

    // Variables is prerequisite of Ownership; Ownership is prerequisite of Concurrency
    const relationships: RelationshipOrderingInput[] = [
      { sourceConceptId: "c-a", targetConceptId: "c-b", type: "prerequisite", confidence: 0.9 },
      { sourceConceptId: "c-b", targetConceptId: "c-c", type: "prerequisite", confidence: 0.85 },
    ];

    const result = computeCurriculumOrder(concepts, relationships);

    expect(result.hasCycle).toBe(false);
    expect(result.orderedConcepts.map((r) => r.concept.id)).toEqual(["c-a", "c-b", "c-c"]);
    expect(result.orderedConcepts[0].depth).toBe(0);
    expect(result.orderedConcepts[1].depth).toBe(1);
    expect(result.orderedConcepts[2].depth).toBe(2);
  });

  it("handles depends_on relationship type inverted correctly", () => {
    const concepts: ConceptOrderingInput[] = [
      { id: "c-1", name: "Memory", slug: "memory", importance: "foundational", confidence: 0.9 },
      { id: "c-2", name: "Pointers", slug: "pointers", importance: "core", confidence: 0.9 },
    ];

    // Pointers depends_on Memory (so Memory is prereq of Pointers)
    const relationships: RelationshipOrderingInput[] = [
      { sourceConceptId: "c-2", targetConceptId: "c-1", type: "depends_on", confidence: 0.8 },
    ];

    const result = computeCurriculumOrder(concepts, relationships);
    expect(result.orderedConcepts.map((r) => r.concept.id)).toEqual(["c-1", "c-2"]);
    expect(result.orderedConcepts[1].prerequisiteIds).toContain("c-1");
  });

  it("breaks cycles deterministically without dropping concepts", () => {
    const concepts: ConceptOrderingInput[] = [
      { id: "node-1", name: "Async", slug: "async", importance: "advanced", confidence: 0.8 },
      { id: "node-2", name: "Threads", slug: "threads", importance: "core", confidence: 0.85 },
      { id: "node-3", name: "Futures", slug: "futures", importance: "foundational", confidence: 0.9 },
    ];

    // Cycle: node-1 -> node-2 -> node-3 -> node-1
    const relationships: RelationshipOrderingInput[] = [
      { sourceConceptId: "node-1", targetConceptId: "node-2", type: "prerequisite", confidence: 0.9 },
      { sourceConceptId: "node-2", targetConceptId: "node-3", type: "prerequisite", confidence: 0.9 },
      { sourceConceptId: "node-3", targetConceptId: "node-1", type: "prerequisite", confidence: 0.9 },
    ];

    const result = computeCurriculumOrder(concepts, relationships);

    expect(result.hasCycle).toBe(true);
    expect(result.cycleNodeIds.length).toBeGreaterThan(0);
    // All 3 concepts must be present in the output
    expect(result.orderedConcepts.length).toBe(3);
    const ids = result.orderedConcepts.map((r) => r.concept.id);
    expect(ids).toContain("node-1");
    expect(ids).toContain("node-2");
    expect(ids).toContain("node-3");
    // Foundational importance (node-3) should be prioritized during cycle resolution
    expect(ids[0]).toBe("node-3");
  });

  it("filters out relationships below confidence threshold (< 0.5)", () => {
    const concepts: ConceptOrderingInput[] = [
      { id: "c-1", name: "A", slug: "a", importance: "core", confidence: 0.9 },
      { id: "c-2", name: "B", slug: "b", importance: "core", confidence: 0.9 },
    ];

    // Low confidence relationship
    const relationships: RelationshipOrderingInput[] = [
      { sourceConceptId: "c-2", targetConceptId: "c-1", type: "prerequisite", confidence: 0.3 },
    ];

    const result = computeCurriculumOrder(concepts, relationships, 0.5);
    // Relationship ignored, order falls back to slug alphabetical (a then b)
    expect(result.orderedConcepts.map((r) => r.concept.id)).toEqual(["c-1", "c-2"]);
    expect(result.orderedConcepts[0].prerequisiteIds).toEqual([]);
  });

  it("safely ignores dangling/nonexistent concept IDs in relationships", () => {
    const concepts: ConceptOrderingInput[] = [
      { id: "c-valid", name: "Valid", slug: "valid", importance: "core", confidence: 0.9 },
    ];

    const relationships: RelationshipOrderingInput[] = [
      { sourceConceptId: "c-ghost", targetConceptId: "c-valid", type: "prerequisite", confidence: 0.9 },
      { sourceConceptId: "c-valid", targetConceptId: "c-another-ghost", type: "prerequisite", confidence: 0.9 },
    ];

    const result = computeCurriculumOrder(concepts, relationships);
    expect(result.orderedConcepts.length).toBe(1);
    expect(result.orderedConcepts[0].concept.id).toBe("c-valid");
    expect(result.orderedConcepts[0].prerequisiteIds).toEqual([]);
  });
});

describe("Curriculum Learning Objectives: Source-Grounded Derivation", () => {
  it("derives actionable objective with file reference and Bloom action verb", () => {
    const objective = deriveLearningObjective(
      "Borrow Checker",
      "Rust mechanism ensuring memory safety without a garbage collector",
      "References must always be valid and can have either one mutable reference or any number of immutable references."
    );

    expect(objective).toBeTruthy();
    expect(objective.length).toBeGreaterThan(20);
    expect(objective).toContain("Borrow Checker");
    expect(objective).toContain("examine how references must always be valid");
  });

  it("handles different concept types with appropriate verbs", () => {
    const archObj = deriveLearningObjective(
      "Compiler Architecture Pipeline",
      "Phases of parsing, type checking, and code generation"
    );
    expect(archObj).toContain("Reason about and apply");

    const guideObj = deriveLearningObjective(
      "Setup Requirements Guide",
      "Instructions for configuring the environment"
    );
    expect(guideObj).toContain("Follow and configure");
  });
});

describe("Authorized Learning Path Query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces tenant isolation and returns null for unowned course", async () => {
    (prisma.course.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const path = await getAuthorizedLearningPath("user-attacker", "foreign-course");
    expect(path).toBeNull();
  });

  it("computes path state correctly with completed, available, and locked nodes", async () => {
    const mockConcepts = [
      {
        id: "c-1",
        name: "Syntax",
        slug: "syntax",
        type: "concept",
        importance: "foundational",
        description: "Language syntax basics",
        evidence: [
          {
            filePath: "src/syntax.rs",
            section: "Basics",
            excerpt: "Syntax details",
            lessonId: "l-1",
            lesson: { id: "l-1", slug: "syntax", title: "Syntax", order: 1 },
          },
        ],
      },
      {
        id: "c-2",
        name: "Ownership",
        slug: "ownership",
        type: "concept",
        importance: "core",
        description: "Ownership system",
        evidence: [
          {
            filePath: "src/ownership.rs",
            section: "Rules",
            excerpt: "Move semantics",
            lessonId: "l-2",
            lesson: { id: "l-2", slug: "ownership", title: "Ownership", order: 2 },
          },
        ],
      },
      {
        id: "c-3",
        name: "Lifetimes",
        slug: "lifetimes",
        type: "concept",
        importance: "advanced",
        description: "Explicit lifetime annotations",
        evidence: [
          {
            filePath: "src/lifetimes.rs",
            section: "Syntax",
            excerpt: "Tick notation",
            lessonId: "l-3",
            lesson: { id: "l-3", slug: "lifetimes", title: "Lifetimes", order: 3 },
          },
        ],
      },
    ];

    // c-1 is prereq of c-2; c-2 is prereq of c-3
    const mockRelationships = [
      { sourceConceptId: "c-1", targetConceptId: "c-2", type: "prerequisite", confidence: 0.9 },
      { sourceConceptId: "c-2", targetConceptId: "c-3", type: "prerequisite", confidence: 0.9 },
    ];

    (prisma.course.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "course-123",
      title: "Rust Core",
      slug: "rust-core",
      workspaceId: "ws-1",
      concepts: mockConcepts,
      conceptRelationships: mockRelationships,
      modules: [
        {
          lessons: [{ id: "l-1" }, { id: "l-2" }, { id: "l-3" }],
        },
      ],
    });

    // User has completed lesson l-1 (so c-1 is completed)
    (prisma.progress.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { lessonId: "l-1", completed: true },
    ]);
    (prisma.practiceAttempt.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.conceptMastery.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const path = await getAuthorizedLearningPath("user-1", "course-123");

    expect(path).not.toBeNull();
    expect(path!.totalConcepts).toBe(3);
    expect(path!.completedConcepts).toBe(1);

    // c-1 is completed
    const node1 = path!.nodes.find((n) => n.conceptId === "c-1");
    expect(node1?.isCompleted).toBe(true);
    expect(node1?.isLocked).toBe(false);

    // c-2's prereq c-1 is completed, so c-2 should be available and nextRecommended
    const node2 = path!.nodes.find((n) => n.conceptId === "c-2");
    expect(node2?.isCompleted).toBe(false);
    expect(node2?.isAvailable).toBe(true);
    expect(node2?.isLocked).toBe(false);
    expect(path!.nextRecommendedConceptId).toBe("c-2");

    // c-3's prereq c-2 is NOT completed, so c-3 must be locked
    const node3 = path!.nodes.find((n) => n.conceptId === "c-3");
    expect(node3?.isCompleted).toBe(false);
    expect(node3?.isAvailable).toBe(false);
    expect(node3?.isLocked).toBe(true);
  });
});
