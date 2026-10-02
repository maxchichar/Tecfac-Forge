import { describe, expect, it } from "vitest";
import { canAdvance, checkSubmission, CreateProjectSchema, milestoneStatus, SubmitProjectSchema } from "@/lib/projects/policy";
import { buildProjectGraph } from "@/lib/projects/graph";
import { projectFixture } from "./fixtures/project";
import { readRequestBodyText } from "@/lib/validation";

const complete = { milestoneId: "m1", artifact: "patch", explanation: "decision", verification: "observed behavior", criterionEvidence: ["a", "b"], selfChecked: false };

describe("project evidence policy", () => {
  it("never certifies technical correctness from persuasive words", () => {
    const result = checkSubmission({ ...complete, explanation: "guarantees correctness because invariant safety" }, ["first", "second"]);
    expect(result.status).toBe("submitted");
    expect(result.feedback).toContain("not yet been verified");
    expect(canAdvance(result.status)).toBe(false);
  });
  it("allows explicit self-check only when all evidence fields are present", () => {
    expect(checkSubmission({ ...complete, selfChecked: true }, ["a", "b"]).status).toBe("self_checked");
    const result = checkSubmission({ ...complete, selfChecked: true, artifact: "", criterionEvidence: ["a", ""] }, ["first", "second"]);
    expect(result.status).toBe("needs_revision");
    expect(result.feedback).toContain("second");
    expect(canAdvance(result.status)).toBe(false);
  });
  it("rejects missing, extra, or whitespace-only criterion evidence", () => {
    for (const criterionEvidence of [["a"], ["a", "b", "c"], ["a", "   "]]) {
      expect(checkSubmission({ ...complete, criterionEvidence }, ["a", "b"]).status).toBe("needs_revision");
    }
  });
  it("does not confuse awaiting review with completion and gates all predecessors", () => {
    expect(milestoneStatus(undefined, ["self_checked", "submitted"])).toBe("locked");
    expect(milestoneStatus(undefined, ["self_checked", "accepted"])).toBe("available");
    expect(milestoneStatus(undefined, ["needs_revision", "accepted"])).toBe("locked");
    expect(milestoneStatus("needs_revision", ["accepted"])).toBe("needs_revision");
  });
  it("rejects duplicate sources and client-supplied certification fields", () => {
    expect(CreateProjectSchema.safeParse({ courseId: "c", title: "A project", outcome: "Build a small working example.", sourceIds: ["s", "s"] }).success).toBe(false);
    expect(SubmitProjectSchema.safeParse({ ...complete, status: "accepted", userId: "someone-else" }).success).toBe(false);
  });
  it("trims evidence before checking completeness", () => {
    const input = SubmitProjectSchema.parse({ ...complete, artifact: "  " });
    expect(checkSubmission(input, ["a", "b"]).status).toBe("needs_revision");
  });
});

describe("learning web", () => {
  it("contains only actual source associations and authored milestone order", () => {
    const graph = buildProjectGraph([projectFixture]);
    expect(graph.nodes.filter((n) => n.kind === "milestone")).toHaveLength(5);
    expect(graph.edges.filter((e) => e.label === "precedes")).toHaveLength(4);
    expect(graph.edges.every((e) => e.reason.length > 0)).toBe(true);
    const ids = new Set(graph.nodes.map((n) => n.id));
    expect(graph.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
  });
  it("shares source and concept nodes across projects without inventing prerequisites", () => {
    const second = { ...projectFixture, id: "second", milestones: projectFixture.milestones.map((m) => ({ ...m, id: `${m.id}-second` })) };
    const graph = buildProjectGraph([projectFixture, second]);
    expect(graph.nodes.filter((n) => n.kind === "source")).toHaveLength(2);
    expect(graph.nodes.filter((n) => n.kind === "concept")).toHaveLength(3);
    expect(graph.edges.filter((e) => e.from === "source:source-1" && e.label === "supports")).toHaveLength(10);
    expect(graph.edges.some((e) => e.label === "prerequisite")).toBe(false);
  });
  it("handles empty projects and keeps finite positions for every node", () => {
    expect(buildProjectGraph([])).toEqual({ nodes: [], edges: [] });
    expect(buildProjectGraph([{ ...projectFixture, milestones: [] }]).nodes).toHaveLength(1);
    expect(buildProjectGraph([projectFixture]).nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
});

describe("bounded submission body", () => {
  it("limits UTF-8 bytes rather than JavaScript string length", async () => {
    const req = new Request("http://localhost", { method: "POST", body: "🕸".repeat(30) });
    expect(await readRequestBodyText(req, 100)).toMatchObject({ ok: false, status: 413 });
  });
  it("reassembles multibyte characters split across stream chunks", async () => {
    const bytes = new TextEncoder().encode("web 🕸");
    const body = new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 5)); controller.enqueue(bytes.slice(5)); controller.close(); } });
    const req = new Request("http://localhost", { method: "POST", body, duplex: "half" } as RequestInit);
    expect(await readRequestBodyText(req, 100)).toEqual({ ok: true, text: "web 🕸" });
  });
});
