import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

// Deliberately separate from .env.local. Only an explicitly supplied local test
// database may be used, and the test owns/cleans only records it creates.
const enabled = process.env.RUN_PROJECT_INTEGRATION === "true";
const ids = { learner: randomUUID(), reviewer: randomUUID(), outsider: randomUUID(), workspace: randomUUID() };
let db: typeof import("@/lib/prisma").prisma;
let service: typeof import("@/lib/server/projects/service");
let projectId: string;
let firstId: string;
let secondId: string;
let currentSubmissionId: string;

describe.skipIf(!enabled)("project learning on isolated PostgreSQL", () => {
  beforeAll(async () => {
    const raw = process.env.PROJECT_TEST_DATABASE_URL;
    if (!raw) throw new Error("Set PROJECT_TEST_DATABASE_URL to a migrated local test database.");
    const url = new URL(raw);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !url.pathname.includes("test")) {
      throw new Error("Integration tests require a local database with 'test' in its name.");
    }
    vi.stubEnv("DATABASE_URL", raw);
    ({ prisma: db } = await import("@/lib/prisma"));
    service = await import("@/lib/server/projects/service");
    await db.user.createMany({ data: Object.entries(ids).filter(([role]) => role !== "workspace").map(([role, id]) => ({ id, name: role, email: `${id}@forge-test.invalid` })) });
    await db.workspace.create({ data: { id: ids.workspace, slug: `project-test-${ids.workspace}`, name: "Project integration test", members: { create: [
      { userId: ids.learner, role: "member" }, { userId: ids.reviewer, role: "owner" },
    ] } } });
  });

  afterAll(async () => {
    if (db) {
      await db.workspace.deleteMany({ where: { id: ids.workspace } });
      await db.user.deleteMany({ where: { id: { in: [ids.learner, ids.reviewer, ids.outsider] } } });
      await db.$disconnect();
    }
    vi.unstubAllEnvs();
  });

  it("imports immutable source provenance and creates the project workflow", async () => {
    const { ingestGitHubRepoToDatabase } = await import("@/lib/server/importers/github");
    const revision = "a".repeat(40);
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/commits/")) return Response.json({ sha: revision });
      if (url.includes("/git/trees/")) return Response.json({ tree: [{ path: "docs/client.md", type: "blob" }] });
      if (url.includes("raw.githubusercontent.com")) return new Response("# Client behavior\n\nUse a configured client to issue a request and inspect its response.");
      return Response.json({ name: "client", default_branch: "main", description: "Test fixture", language: "TypeScript" });
    });
    const imported = await ingestGitHubRepoToDatabase(ids.workspace, "fixture/client", fetcher as typeof fetch);
    expect(imported.ok).toBe(true); if (!imported.ok) throw new Error(imported.error);
    const source = await db.lesson.findFirstOrThrow({ where: { module: { courseId: imported.courseId } } });
    expect(source.sourceRevision).toBe(revision);
    expect(source.sourcePath).toBe("docs/client.md");
    expect(source.sourceUrl).toBe(`https://github.com/fixture/client/blob/${revision}/docs/client.md`);
    const created = await service.createLearningProject(ids.learner, { courseId: imported.courseId, title: "Build a working client", outcome: "Implement and verify a small client example.", sourceIds: [source.id] });
    projectId = created.id;
    const [project] = await service.getLearningProjects(ids.learner, projectId);
    expect(project.milestones).toHaveLength(5);
    [firstId, secondId] = project.milestones.map((m) => m.id);
    expect(project.milestones[0].status).toBe("available");
    expect(project.milestones[1].status).toBe("locked");
  });

  const evidence = () => ({ milestoneId: firstId, artifact: "Example investigation artifact", explanation: "See docs/client.md for the documented behavior.", verification: "Compared the explanation to the selected source.", criterionEvidence: ["Relevant behavior is traced in the artifact.", "Constraints and open questions are recorded."], selfChecked: true });

  it("rejects an outsider and refuses a skipped milestone", async () => {
    expect(await service.getLearningProjects(ids.outsider, projectId)).toEqual([]);
    await expect(service.submitProjectMilestone(ids.outsider, projectId, evidence())).rejects.toMatchObject({ status: 404 });
    await expect(service.submitProjectMilestone(ids.learner, projectId, { ...evidence(), milestoneId: secondId })).rejects.toMatchObject({ status: 409 });
  });

  it("saves an incomplete attempt, then a self-checked revision, without sharing learner state", async () => {
    const incomplete = await service.submitProjectMilestone(ids.learner, projectId, { ...evidence(), artifact: "" });
    expect(incomplete.status).toBe("needs_revision");
    const complete = await service.submitProjectMilestone(ids.learner, projectId, evidence());
    currentSubmissionId = complete.id;
    const [learnerProject] = await service.getLearningProjects(ids.learner, projectId);
    const [reviewerProject] = await service.getLearningProjects(ids.reviewer, projectId);
    expect(learnerProject.milestones[0].submissions).toHaveLength(2);
    expect(learnerProject.milestones[1].status).toBe("available");
    expect(reviewerProject.milestones[0].submissions).toHaveLength(0);
    expect(reviewerProject.milestones[1].status).toBe("locked");
  });

  it("records independent rejection, blocks advancement, and accepts the revised work", async () => {
    const queue = await service.getProjectReviewQueue(ids.reviewer);
    expect(queue.some((item) => item.id === currentSubmissionId)).toBe(true);
    await service.reviewProjectSubmission(ids.reviewer, projectId, { submissionId: currentSubmissionId, status: "needs_revision", feedback: "Please clarify the missing source constraint." });
    await expect(service.submitProjectMilestone(ids.learner, projectId, { ...evidence(), milestoneId: secondId })).rejects.toMatchObject({ status: 409 });
    const revised = await service.submitProjectMilestone(ids.learner, projectId, { ...evidence(), selfChecked: false });
    await service.reviewProjectSubmission(ids.reviewer, projectId, { submissionId: revised.id, status: "accepted", feedback: "Inspected the revised artifact against both criteria." });
    const [project] = await service.getLearningProjects(ids.learner, projectId);
    expect(project.milestones[0].status).toBe("accepted");
    expect(project.milestones[1].status).toBe("available");
    expect(await db.conceptMastery.count({ where: { userId: ids.learner } })).toBe(0);
  });
});
